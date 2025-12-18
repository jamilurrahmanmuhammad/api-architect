"""
Tokenizer/Lexer for DSL Parser.

Tokenizes markdown-based DSL syntax into a stream of tokens for parsing.

DSL Syntax Elements:
- Headers: # Service, ## Model, ## Operation, ## Error
- Key-value pairs: version: 1.0.0, base_path: /api
- Tables: | name | type | required |
- HTTP methods: GET, POST, PUT, PATCH, DELETE
- Text blocks: descriptions, comments

The lexer is line-oriented to match the markdown structure.
"""

import re
from dataclasses import dataclass
from enum import Enum, auto
from typing import Iterator, Optional


class TokenType(Enum):
    """Token types for DSL syntax."""

    # Headers
    H1 = auto()           # # Service
    H2 = auto()           # ## Model, ## Operation, ## Error
    H3 = auto()           # ### subsection

    # Keywords
    SERVICE = auto()      # Service
    MODEL = auto()        # Model
    OPERATION = auto()    # Operation
    ERROR = auto()        # Error

    # HTTP Methods
    HTTP_METHOD = auto()  # GET, POST, PUT, PATCH, DELETE

    # Delimiters
    COLON = auto()        # :
    PIPE = auto()         # |
    COMMA = auto()        # ,
    LBRACKET = auto()     # [
    RBRACKET = auto()     # ]

    # Literals
    STRING = auto()       # "value" or plain text
    NUMBER = auto()       # 123, 1.0
    BOOLEAN = auto()      # true, false
    PATH = auto()         # /api/v1/pets/{id}
    IDENTIFIER = auto()   # name, Pet, etc.

    # Structural
    TABLE_SEPARATOR = auto()  # |---|---| (deprecated)
    NEWLINE = auto()          # Line break
    INDENT = auto()           # Leading whitespace
    TEXT = auto()             # Plain text (description, etc.)
    LIST_ITEM = auto()        # - field (type) - description (natural language syntax)

    # Special
    BOLD = auto()         # **text**
    ITALIC = auto()       # *text*
    CODE = auto()         # `code`
    CODE_BLOCK = auto()   # ```code```

    # Control
    EOF = auto()          # End of file
    UNKNOWN = auto()      # Unrecognized token


@dataclass
class Token:
    """A single token from the lexer."""
    type: TokenType
    value: str
    line: int
    column: int

    def __repr__(self) -> str:
        return f"Token({self.type.name}, '{self.value}', L{self.line}:{self.column})"


class Lexer:
    """
    Tokenizer for DSL syntax.

    Processes input line-by-line, recognizing:
    - Markdown headers (# ## ###)
    - Key-value pairs (key: value)
    - Tables (| col1 | col2 |)
    - HTTP operations (GET /path)
    - Plain text descriptions
    """

    # HTTP methods
    HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}

    # Keywords that follow headers
    KEYWORDS = {"Service", "Model", "Operation", "Error"}

    # Patterns
    HEADER_PATTERN = re.compile(r'^(#{1,3})\s*(.*)$')
    KEY_VALUE_PATTERN = re.compile(r'^(\w+)\s*:\s*(.*)$')
    TABLE_ROW_PATTERN = re.compile(r'^\|(.+)\|$')
    TABLE_SEPARATOR_PATTERN = re.compile(r'^\|[-:\s|]+\|$')
    HTTP_OP_PATTERN = re.compile(r'^(GET|POST|PUT|PATCH|DELETE)\s+(/\S*)(.*)$', re.IGNORECASE)
    STATUS_CODE_PATTERN = re.compile(r'^(\d{3})\s+(\w+)(.*)$')
    PATH_PATTERN = re.compile(r'^(/\S+)$')
    BOLD_PATTERN = re.compile(r'\*\*([^*]+)\*\*')
    CODE_PATTERN = re.compile(r'`([^`]+)`')
    # Natural language field syntax: - field_name (type) or - field_name (type, required) - description
    LIST_ITEM_PATTERN = re.compile(r'^-\s+(\w+)\s*\(([^)]+)\)(?:\s*-\s*(.*))?$')

    def __init__(self, source: str):
        """Initialize lexer with source code."""
        self.source = source
        self.lines = source.split('\n')
        self.line_num = 0
        self.col_num = 0
        self.current_line = ""
        self.tokens: list[Token] = []

    def tokenize(self) -> list[Token]:
        """
        Tokenize the entire source and return list of tokens.

        Returns:
            List of Token objects
        """
        self.tokens = []

        for self.line_num, line in enumerate(self.lines, start=1):
            self.current_line = line
            self.col_num = 1

            # Skip empty lines but record them
            if not line.strip():
                self.tokens.append(Token(TokenType.NEWLINE, "", self.line_num, 1))
                continue

            # Check for leading whitespace (indent)
            stripped = line.lstrip()
            indent = len(line) - len(stripped)
            if indent > 0:
                self.tokens.append(Token(TokenType.INDENT, " " * indent, self.line_num, 1))
                self.col_num = indent + 1

            # Process the line content
            self._tokenize_line(stripped)

            # Add newline at end of non-empty line
            self.tokens.append(Token(TokenType.NEWLINE, "", self.line_num, len(line) + 1))

        # Add EOF
        self.tokens.append(Token(TokenType.EOF, "", self.line_num + 1, 1))

        return self.tokens

    def _tokenize_line(self, line: str) -> None:
        """Tokenize a single line."""

        # Check for markdown headers
        header_match = self.HEADER_PATTERN.match(line)
        if header_match:
            hashes, content = header_match.groups()
            level = len(hashes)

            # Add header token
            if level == 1:
                self.tokens.append(Token(TokenType.H1, hashes, self.line_num, self.col_num))
            elif level == 2:
                self.tokens.append(Token(TokenType.H2, hashes, self.line_num, self.col_num))
            else:
                self.tokens.append(Token(TokenType.H3, hashes, self.line_num, self.col_num))

            self.col_num += level + 1  # hashes + space

            # Parse header content
            self._tokenize_header_content(content.strip())
            return

        # DEPRECATED: Table syntax is no longer supported
        # Table separators and rows are now treated as plain text with a warning
        if self.TABLE_SEPARATOR_PATTERN.match(line) or self.TABLE_ROW_PATTERN.match(line):
            # Produce TEXT token - parser will generate migration error
            self.tokens.append(Token(TokenType.TEXT, line, self.line_num, self.col_num))
            return

        # Check for key-value pair
        kv_match = self.KEY_VALUE_PATTERN.match(line)
        if kv_match:
            key, value = kv_match.groups()
            self.tokens.append(Token(TokenType.IDENTIFIER, key, self.line_num, self.col_num))
            self.col_num += len(key)
            self.tokens.append(Token(TokenType.COLON, ":", self.line_num, self.col_num))
            self.col_num += 2  # colon + space

            if value.strip():
                self._tokenize_value(value.strip())
            return

        # Check for list item (natural language field syntax): - field (type) - description
        list_item_match = self.LIST_ITEM_PATTERN.match(line)
        if list_item_match:
            # Store the entire matched content as the token value for parser to extract details
            self.tokens.append(Token(TokenType.LIST_ITEM, line, self.line_num, self.col_num))
            return

        # Check for bold markers like **Request**:
        bold_match = self.BOLD_PATTERN.match(line)
        if bold_match or line.startswith("**"):
            self._tokenize_bold_line(line)
            return

        # Default: treat as plain text
        self.tokens.append(Token(TokenType.TEXT, line, self.line_num, self.col_num))

    def _tokenize_header_content(self, content: str) -> None:
        """Tokenize the content after a header marker."""
        if not content:
            return

        # Check for keyword followed by colon or content
        # e.g., "Service: Petstore API" or "Model: Pet"
        parts = content.split(":", 1)
        first_word = parts[0].strip()

        if first_word in self.KEYWORDS:
            # Add keyword token
            keyword_type = getattr(TokenType, first_word.upper(), TokenType.IDENTIFIER)
            self.tokens.append(Token(keyword_type, first_word, self.line_num, self.col_num))
            self.col_num += len(first_word)

            if len(parts) > 1 and parts[1].strip():
                self.tokens.append(Token(TokenType.COLON, ":", self.line_num, self.col_num))
                self.col_num += 2
                rest = parts[1].strip()

                # For Operation, check for HTTP method and path
                if first_word == "Operation":
                    http_match = self.HTTP_OP_PATTERN.match(rest)
                    if http_match:
                        method, path, suffix = http_match.groups()
                        self.tokens.append(Token(TokenType.HTTP_METHOD, method.upper(), self.line_num, self.col_num))
                        self.col_num += len(method) + 1
                        self.tokens.append(Token(TokenType.PATH, path, self.line_num, self.col_num))
                        if suffix.strip():
                            self.col_num += len(path) + 1
                            self.tokens.append(Token(TokenType.TEXT, suffix.strip(), self.line_num, self.col_num))
                        return

                # For Error, check for status code and name
                if first_word == "Error":
                    status_match = self.STATUS_CODE_PATTERN.match(rest)
                    if status_match:
                        code, name, suffix = status_match.groups()
                        self.tokens.append(Token(TokenType.NUMBER, code, self.line_num, self.col_num))
                        self.col_num += len(code) + 1
                        self.tokens.append(Token(TokenType.IDENTIFIER, name, self.line_num, self.col_num))
                        if suffix.strip():
                            self.col_num += len(name) + 1
                            self.tokens.append(Token(TokenType.TEXT, suffix.strip(), self.line_num, self.col_num))
                        return

                # Default: rest is the name/title
                self.tokens.append(Token(TokenType.IDENTIFIER, rest, self.line_num, self.col_num))
            return

        # Check for direct HTTP operation without keyword: "GET /pets"
        http_match = self.HTTP_OP_PATTERN.match(content)
        if http_match:
            method, path, rest = http_match.groups()
            self.tokens.append(Token(TokenType.HTTP_METHOD, method.upper(), self.line_num, self.col_num))
            self.col_num += len(method) + 1
            self.tokens.append(Token(TokenType.PATH, path, self.line_num, self.col_num))
            if rest.strip():
                self.col_num += len(path) + 1
                self.tokens.append(Token(TokenType.TEXT, rest.strip(), self.line_num, self.col_num))
            return

        # Check for direct error definition: "404 NotFound"
        status_match = self.STATUS_CODE_PATTERN.match(content)
        if status_match:
            code, name, rest = status_match.groups()
            self.tokens.append(Token(TokenType.NUMBER, code, self.line_num, self.col_num))
            self.col_num += len(code) + 1
            self.tokens.append(Token(TokenType.IDENTIFIER, name, self.line_num, self.col_num))
            if rest.strip():
                self.col_num += len(name) + 1
                self.tokens.append(Token(TokenType.TEXT, rest.strip(), self.line_num, self.col_num))
            return

        # Default: treat as identifier or text
        self.tokens.append(Token(TokenType.IDENTIFIER, content, self.line_num, self.col_num))

    def _tokenize_table_row(self, line: str) -> None:
        """Tokenize a markdown table row."""
        # Split by pipe and process each cell
        self.tokens.append(Token(TokenType.PIPE, "|", self.line_num, self.col_num))
        self.col_num += 1

        # Get cells between pipes
        inner = line[1:-1]  # Remove leading and trailing pipes
        cells = inner.split("|")

        for i, cell in enumerate(cells):
            cell_content = cell.strip()
            if cell_content:
                self._tokenize_value(cell_content)

            if i < len(cells) - 1:
                self.tokens.append(Token(TokenType.PIPE, "|", self.line_num, self.col_num))
            self.col_num += len(cell) + 1

        self.tokens.append(Token(TokenType.PIPE, "|", self.line_num, self.col_num))

    def _tokenize_value(self, value: str) -> None:
        """Tokenize a value (could be string, number, boolean, identifier)."""
        # Boolean
        if value.lower() in ("true", "false"):
            self.tokens.append(Token(TokenType.BOOLEAN, value.lower(), self.line_num, self.col_num))
            return

        # Number
        try:
            float(value)
            self.tokens.append(Token(TokenType.NUMBER, value, self.line_num, self.col_num))
            return
        except ValueError:
            pass

        # Path (starts with /)
        if value.startswith("/"):
            self.tokens.append(Token(TokenType.PATH, value, self.line_num, self.col_num))
            return

        # Array (starts with [)
        if value.startswith("[") and value.endswith("]"):
            self._tokenize_array(value)
            return

        # Identifier or string
        self.tokens.append(Token(TokenType.IDENTIFIER, value, self.line_num, self.col_num))

    def _tokenize_array(self, value: str) -> None:
        """Tokenize an array value like [Pet, Order]."""
        self.tokens.append(Token(TokenType.LBRACKET, "[", self.line_num, self.col_num))
        self.col_num += 1

        inner = value[1:-1]  # Remove brackets
        items = [item.strip() for item in inner.split(",")]

        for i, item in enumerate(items):
            if item:
                self.tokens.append(Token(TokenType.IDENTIFIER, item, self.line_num, self.col_num))
                self.col_num += len(item)
            if i < len(items) - 1:
                self.tokens.append(Token(TokenType.COMMA, ",", self.line_num, self.col_num))
                self.col_num += 2

        self.tokens.append(Token(TokenType.RBRACKET, "]", self.line_num, self.col_num))

    def _tokenize_bold_line(self, line: str) -> None:
        """Tokenize a line with bold markers like **Request**: Pet."""
        # Match **keyword**: value pattern
        match = re.match(r'\*\*([^*]+)\*\*\s*:\s*(.*)', line)
        if match:
            keyword, value = match.groups()
            self.tokens.append(Token(TokenType.BOLD, keyword, self.line_num, self.col_num))
            self.col_num += len(keyword) + 4  # ** + keyword + **
            self.tokens.append(Token(TokenType.COLON, ":", self.line_num, self.col_num))
            self.col_num += 2
            if value.strip():
                self._tokenize_value(value.strip())
            return

        # Just bold text
        match = re.match(r'\*\*([^*]+)\*\*', line)
        if match:
            self.tokens.append(Token(TokenType.BOLD, match.group(1), self.line_num, self.col_num))
            return

        # Fallback to text
        self.tokens.append(Token(TokenType.TEXT, line, self.line_num, self.col_num))

    def peek_tokens(self, n: int = 1) -> list[Token]:
        """Preview the next n tokens without consuming them."""
        return self.tokens[:n] if self.tokens else []

    def __iter__(self) -> Iterator[Token]:
        """Iterate over tokens."""
        if not self.tokens:
            self.tokenize()
        return iter(self.tokens)
