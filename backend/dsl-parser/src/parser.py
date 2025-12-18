"""
Recursive Descent Parser for DSL.

Parses tokenized DSL into an Abstract Syntax Tree (AST).

Grammar (simplified):
    requirements := (service | model | operation | error)*
    service := H1 SERVICE ':' identifier properties? operations*
    model := H2 MODEL ':' identifier description? field_table?
    operation := H2 OPERATION ':' http_method path description? request? response? errors?
    error := H2 ERROR ':' number identifier description?
    field_table := table_header table_separator table_row+

Parser features:
- Best-effort parsing: continues after errors to find valid entities
- Error recovery: skips to next valid section on error
- Location tracking: every AST node includes source location
"""

from typing import Optional

try:
    # Package imports (when installed as package)
    from .dsl_ast import (
        ParsedRequirements,
        ServiceNode,
        ModelNode,
        FieldNode,
        OperationNode,
        ErrorNode,
        SourceLocation,
    )
    from .errors import ParseError, ParseErrorType, ErrorSeverity, ParseErrorCollection
    from .lexer import Lexer, Token, TokenType
except ImportError:
    # Direct imports (when running from src directory)
    from dsl_ast import (
        ParsedRequirements,
        ServiceNode,
        ModelNode,
        FieldNode,
        OperationNode,
        ErrorNode,
        SourceLocation,
    )
    from errors import ParseError, ParseErrorType, ErrorSeverity, ParseErrorCollection
    from lexer import Lexer, Token, TokenType


class Parser:
    """
    Recursive descent parser for DSL syntax.

    Supports best-effort parsing: even if parts of the file are invalid,
    valid entities are still extracted and returned.
    """

    def __init__(self, source: str):
        """Initialize parser with source code."""
        self.source = source
        self.lexer = Lexer(source)
        self.tokens: list[Token] = []
        self.pos = 0
        self.errors = ParseErrorCollection()

        # Track defined entities for duplicate detection
        self._services: dict[str, int] = {}  # name -> first definition line
        self._models: dict[str, int] = {}
        self._errors_defined: dict[str, int] = {}

    def parse(self) -> ParsedRequirements:
        """
        Parse the source and return structured requirements.

        Returns:
            ParsedRequirements containing all parsed entities and errors
        """
        # Tokenize
        self.tokens = self.lexer.tokenize()
        self.pos = 0

        # Parse
        result = ParsedRequirements()

        while not self._at_end():
            try:
                # Skip whitespace/newlines at top level
                self._skip_whitespace()

                if self._at_end():
                    break

                token = self._peek()

                # Parse based on header level
                if token.type == TokenType.H1:
                    service = self._parse_service()
                    if service:
                        result.services.append(service)

                elif token.type == TokenType.H2:
                    # Could be Model, Operation, or Error
                    entity = self._parse_h2_entity()
                    if entity:
                        if isinstance(entity, ModelNode):
                            result.models.append(entity)
                        elif isinstance(entity, OperationNode):
                            result.operations.append(entity)
                        elif isinstance(entity, ErrorNode):
                            result.errors.append(entity)

                else:
                    # Skip unknown content
                    self._advance()

            except Exception as e:
                # Record error and continue to next section
                self.errors.add(ParseError(
                    line=self._peek().line if not self._at_end() else self.tokens[-1].line,
                    column=1,
                    message=str(e),
                    error_type=ParseErrorType.INVALID_SYNTAX,
                ))
                self._skip_to_next_header()

        # Add collected errors to result
        result.parse_errors = list(self.errors)

        return result

    def _parse_service(self) -> Optional[ServiceNode]:
        """
        Parse a service definition.

        Grammar:
            service := H1 SERVICE ':' identifier properties?
        """
        start_token = self._advance()  # Consume H1
        location = SourceLocation(start_token.line, start_token.column)

        # Expect SERVICE keyword
        if not self._check(TokenType.SERVICE):
            # Check if it's IDENTIFIER that could be "Service"
            if self._check(TokenType.IDENTIFIER) and self._peek().value.lower() == "service":
                self._advance()
            else:
                self.errors.add(ParseError.missing_header(
                    start_token.line, start_token.column, "# Service"
                ))
                self._skip_to_next_header()
                return None
        else:
            self._advance()  # Consume SERVICE

        # Optional colon
        if self._check(TokenType.COLON):
            self._advance()

        # Get service name
        name = "unnamed"
        if self._check(TokenType.IDENTIFIER):
            name = self._advance().value

        # Check for duplicate
        if name in self._services:
            self.errors.add(ParseError.duplicate_entity(
                location.line, location.column, "Service", name, self._services[name]
            ))
        else:
            self._services[name] = location.line

        # Parse optional properties and description
        self._skip_whitespace()

        description = None
        version = "1.0.0"
        base_path = "/api"
        title = name

        # Parse key-value properties until next header
        while not self._at_end() and not self._check(TokenType.H1, TokenType.H2):
            self._skip_whitespace()

            if self._at_end() or self._check(TokenType.H1, TokenType.H2):
                break

            if self._check(TokenType.IDENTIFIER):
                key_token = self._advance()
                key = key_token.value.lower()

                if self._check(TokenType.COLON):
                    self._advance()

                    if self._check(TokenType.IDENTIFIER, TokenType.NUMBER, TokenType.PATH):
                        value = self._advance().value
                        if key == "version":
                            version = value
                        elif key == "base_path" or key == "basepath":
                            base_path = value
                        elif key == "title":
                            title = value

            elif self._check(TokenType.TEXT):
                # Description text
                text = self._advance().value
                if description:
                    description += "\n" + text
                else:
                    description = text

            elif self._check(TokenType.NEWLINE, TokenType.INDENT):
                self._advance()

            else:
                self._advance()

        return ServiceNode(
            name=name,
            title=title,
            description=description,
            version=version,
            base_path=base_path,
            location=location,
        )

    def _parse_h2_entity(self) -> Optional[ModelNode | OperationNode | ErrorNode]:
        """Parse an H2 entity (Model, Operation, or Error)."""
        start_token = self._advance()  # Consume H2
        location = SourceLocation(start_token.line, start_token.column)

        # Determine type
        if self._check(TokenType.MODEL):
            return self._parse_model(location)
        elif self._check(TokenType.OPERATION):
            return self._parse_operation(location)
        elif self._check(TokenType.ERROR):
            return self._parse_error_def(location)
        elif self._check(TokenType.HTTP_METHOD):
            # Operation without keyword: ## GET /pets
            return self._parse_operation(location, skip_keyword=True)
        elif self._check(TokenType.NUMBER):
            # Error without keyword: ## 404 NotFound
            return self._parse_error_def(location, skip_keyword=True)
        elif self._check(TokenType.IDENTIFIER):
            # Could be Model: Pet or just text
            ident = self._peek().value.lower()
            if ident == "model":
                self._advance()
                return self._parse_model(location, skip_keyword=True)
            elif ident == "operation":
                self._advance()
                return self._parse_operation(location, skip_keyword=True)
            elif ident == "error":
                self._advance()
                return self._parse_error_def(location, skip_keyword=True)
            else:
                # Assume it's a model name
                return self._parse_model(location, skip_keyword=True)
        else:
            self.errors.add(ParseError(
                line=start_token.line,
                column=start_token.column,
                message="Expected Model, Operation, or Error after ##",
                error_type=ParseErrorType.INVALID_KEYWORD,
            ))
            self._skip_to_next_header()
            return None

    def _parse_model(self, location: SourceLocation, skip_keyword: bool = False) -> Optional[ModelNode]:
        """
        Parse a model definition.

        Grammar:
            model := H2 MODEL ':' identifier description? field_table?
        """
        if not skip_keyword:
            self._advance()  # Consume MODEL

        # Optional colon
        if self._check(TokenType.COLON):
            self._advance()

        # Get model name
        name = "unnamed"
        if self._check(TokenType.IDENTIFIER):
            name = self._advance().value

        # Check for duplicate
        if name in self._models:
            self.errors.add(ParseError.duplicate_entity(
                location.line, location.column, "Model", name, self._models[name]
            ))
        else:
            self._models[name] = location.line

        self._skip_whitespace()

        description = None
        fields: list[FieldNode] = []

        # Parse content until next header
        while not self._at_end() and not self._check(TokenType.H1, TokenType.H2):
            self._skip_whitespace()

            if self._at_end() or self._check(TokenType.H1, TokenType.H2):
                break

            # Check for list item (natural language field syntax)
            if self._check(TokenType.LIST_ITEM):
                field = self._parse_list_field()
                if field:
                    fields.append(field)

            # Deprecated: Table syntax - skip and produce warning in description
            elif self._check(TokenType.PIPE):
                # Old table syntax is no longer supported
                self._advance()

            elif self._check(TokenType.TABLE_SEPARATOR):
                self._advance()  # Skip separator

            elif self._check(TokenType.TEXT):
                text = self._advance().value
                # Skip table-like content (rows starting with |)
                if not text.strip().startswith("|"):
                    if description:
                        description += "\n" + text
                    else:
                        description = text

            elif self._check(TokenType.NEWLINE, TokenType.INDENT):
                self._advance()

            else:
                self._advance()

        return ModelNode(
            name=name,
            description=description,
            fields=fields,
            location=location,
        )

    def _parse_list_field(self) -> Optional[FieldNode]:
        """
        Parse a natural language field definition.

        Format: - field_name (type) - description
                - field_name (type, required) - description
                - field_name (type)

        The LIST_ITEM token value contains the full line text.
        """
        import re

        if not self._check(TokenType.LIST_ITEM):
            return None

        token = self._advance()
        line = token.value
        location = SourceLocation(token.line, token.column)

        # Pattern: - field_name (type_info) - optional description
        # type_info can be: type, type[], Type, Type[], type, required, etc.
        pattern = re.compile(r'^-\s+(\w+)\s*\(([^)]+)\)(?:\s*-\s*(.*))?$')
        match = pattern.match(line)

        if not match:
            return None

        field_name = match.group(1)
        type_info = match.group(2).strip()
        description = match.group(3).strip() if match.group(3) else None

        # Parse type_info: could be "type" or "type, required" or "Type[]" etc.
        required = False
        field_type = type_info

        # Check if "required" is in the type info
        if "," in type_info:
            parts = [p.strip() for p in type_info.split(",")]
            # First part is the type
            field_type = parts[0]
            # Check for required flag
            for part in parts[1:]:
                if part.lower() == "required":
                    required = True

        return FieldNode(
            name=field_name,
            field_type=field_type,
            required=required,
            description=description,
            location=location,
        )

    def _parse_field_table(self) -> list[FieldNode]:
        """Parse a markdown field table. DEPRECATED - returns empty list."""
        # Table syntax is deprecated - skip all table content
        fields: list[FieldNode] = []
        return fields

    def _parse_table_row(self) -> list[str]:
        """Parse a single table row and return cell values."""
        cells: list[str] = []

        if not self._check(TokenType.PIPE):
            return cells

        self._advance()  # Opening pipe

        while not self._at_end() and not self._check(TokenType.NEWLINE):
            if self._check(TokenType.PIPE):
                self._advance()
                # Check if this is the closing pipe (next is newline or end)
                if self._check(TokenType.NEWLINE) or self._at_end():
                    break
            elif self._check(TokenType.IDENTIFIER, TokenType.NUMBER, TokenType.BOOLEAN, TokenType.TEXT):
                cells.append(self._advance().value)
            else:
                self._advance()

        return cells

    def _row_to_field(self, row: list[str]) -> Optional[FieldNode]:
        """Convert a table row to a FieldNode."""
        if len(row) < 2:
            return None

        name = row[0]
        field_type = row[1]
        required = True
        description = None

        if len(row) >= 3:
            req_val = row[2].lower()
            required = req_val in ("true", "yes", "required", "1")

        if len(row) >= 4:
            description = row[3]

        return FieldNode(
            name=name,
            field_type=field_type,
            required=required,
            description=description,
            location=SourceLocation(self._peek().line if not self._at_end() else 1, 1),
        )

    def _parse_operation(self, location: SourceLocation, skip_keyword: bool = False) -> Optional[OperationNode]:
        """
        Parse an operation definition.

        Grammar:
            operation := H2 OPERATION ':' http_method path description? request? response? errors?
        """
        if not skip_keyword:
            self._advance()  # Consume OPERATION

        # Optional colon
        if self._check(TokenType.COLON):
            self._advance()

        # HTTP method
        method = "GET"
        if self._check(TokenType.HTTP_METHOD):
            method = self._advance().value.upper()
        elif self._check(TokenType.IDENTIFIER):
            potential_method = self._peek().value.upper()
            if potential_method in ("GET", "POST", "PUT", "PATCH", "DELETE"):
                method = self._advance().value.upper()

        # Path
        path = "/"
        if self._check(TokenType.PATH):
            path = self._advance().value
        elif self._check(TokenType.IDENTIFIER):
            # Might be path without leading /
            val = self._peek().value
            if "/" in val or val.startswith("{"):
                path = self._advance().value

        self._skip_whitespace()

        summary = None
        description = None
        request_model = None
        response_model = None
        error_refs: list[str] = []

        # Parse content
        while not self._at_end() and not self._check(TokenType.H1, TokenType.H2):
            self._skip_whitespace()

            if self._at_end() or self._check(TokenType.H1, TokenType.H2):
                break

            if self._check(TokenType.BOLD):
                bold = self._advance().value.lower()
                if self._check(TokenType.COLON):
                    self._advance()

                if self._check(TokenType.IDENTIFIER, TokenType.TEXT):
                    value = self._advance().value
                    if bold in ("request", "requestbody"):
                        request_model = value
                    elif bold in ("response", "responsebody", "returns"):
                        response_model = value.rstrip("[]")  # Remove array marker
                    elif bold in ("errors", "error"):
                        # Parse error references
                        error_refs = self._parse_error_refs(value)

            elif self._check(TokenType.TEXT):
                text = self._advance().value
                if not summary:
                    summary = text
                elif description:
                    description += "\n" + text
                else:
                    description = text

            elif self._check(TokenType.NEWLINE, TokenType.INDENT):
                self._advance()

            else:
                self._advance()

        return OperationNode(
            method=method,
            path=path,
            summary=summary,
            description=description,
            request_model=request_model,
            response_model=response_model,
            error_refs=error_refs,
            location=location,
        )

    def _parse_error_refs(self, value: str) -> list[str]:
        """Parse error references like '404 NotFound, 500 InternalError'."""
        refs = []
        parts = value.split(",")
        for part in parts:
            part = part.strip()
            if part:
                # Extract error name (e.g., "404 NotFound" -> "NotFound")
                words = part.split()
                if len(words) >= 2:
                    refs.append(words[1])
                elif words:
                    refs.append(words[0])
        return refs

    def _parse_error_def(self, location: SourceLocation, skip_keyword: bool = False) -> Optional[ErrorNode]:
        """
        Parse an error definition.

        Grammar:
            error := H2 ERROR ':' number identifier description?
        """
        if not skip_keyword:
            self._advance()  # Consume ERROR

        # Optional colon
        if self._check(TokenType.COLON):
            self._advance()

        # Status code
        status_code = 500
        if self._check(TokenType.NUMBER):
            try:
                status_code = int(self._advance().value)
            except ValueError:
                pass

        # Error name
        name = "Error"
        if self._check(TokenType.IDENTIFIER):
            name = self._advance().value

        # Check for duplicate
        if name in self._errors_defined:
            self.errors.add(ParseError.duplicate_entity(
                location.line, location.column, "Error", name, self._errors_defined[name]
            ))
        else:
            self._errors_defined[name] = location.line

        # Validate status code
        if status_code < 100 or status_code > 599:
            self.errors.add(ParseError.invalid_status_code(
                location.line, location.column, str(status_code)
            ))

        self._skip_whitespace()

        description = None

        # Parse description
        while not self._at_end() and not self._check(TokenType.H1, TokenType.H2):
            self._skip_whitespace()

            if self._at_end() or self._check(TokenType.H1, TokenType.H2):
                break

            if self._check(TokenType.TEXT):
                text = self._advance().value
                if description:
                    description += "\n" + text
                else:
                    description = text

            elif self._check(TokenType.NEWLINE, TokenType.INDENT):
                self._advance()

            else:
                self._advance()

        return ErrorNode(
            status_code=status_code,
            name=name,
            description=description,
            location=location,
        )

    # Helper methods

    def _at_end(self) -> bool:
        """Check if at end of tokens."""
        return self.pos >= len(self.tokens) or self.tokens[self.pos].type == TokenType.EOF

    def _peek(self) -> Token:
        """Look at current token without consuming."""
        if self._at_end():
            return self.tokens[-1]  # EOF
        return self.tokens[self.pos]

    def _advance(self) -> Token:
        """Consume and return current token."""
        token = self._peek()
        if not self._at_end():
            self.pos += 1
        return token

    def _check(self, *types: TokenType) -> bool:
        """Check if current token matches any of the given types."""
        if self._at_end():
            return False
        return self._peek().type in types

    def _skip_whitespace(self) -> None:
        """Skip newlines and indents."""
        while self._check(TokenType.NEWLINE, TokenType.INDENT):
            self._advance()

    def _skip_to_next_header(self) -> None:
        """Skip tokens until the next header or EOF."""
        while not self._at_end() and not self._check(TokenType.H1, TokenType.H2, TokenType.H3):
            self._advance()


def parse(source: str) -> ParsedRequirements:
    """
    Convenience function to parse DSL source code.

    Args:
        source: DSL source code string

    Returns:
        ParsedRequirements containing parsed entities and errors
    """
    parser = Parser(source)
    return parser.parse()
