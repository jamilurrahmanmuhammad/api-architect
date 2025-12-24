"""
T061: Parser service for DSL content.

Parses DSL content and returns structured ParsedRequirements.
Uses inline parsing to avoid cross-package dependencies.
"""

import re
from typing import Any, Optional


class ParserService:
    """
    Service for parsing DSL content into structured data.

    Implements a simplified inline parser that extracts:
    - Services
    - Models with fields
    - Operations
    - Errors
    """

    def __init__(self):
        """Initialize parser service."""
        pass

    def parse(self, content: str) -> dict[str, Any]:
        """
        Parse DSL content and return structured result.

        Args:
            content: DSL content string

        Returns:
            Dictionary with services, models, operations, errors, parse_errors
        """
        if not content or not content.strip():
            return self._empty_result()

        result = {
            "services": [],
            "models": [],
            "operations": [],
            "errors": [],
            "parse_errors": [],
        }

        lines = content.split('\n')
        current_section = None
        current_entity = None
        in_table = False
        table_fields = []

        for line_num, line in enumerate(lines, start=1):
            stripped = line.strip()

            # Parse service header: # Service: Name
            if stripped.startswith('# Service:'):
                if current_entity and current_section == 'model':
                    current_entity['fields'] = table_fields
                    result['models'].append(current_entity)

                service_name = stripped[10:].strip()
                current_section = 'service'
                current_entity = {
                    "name": service_name,
                    "title": service_name,
                    "description": None,
                    "version": "1.0.0",
                    "base_path": "/api",
                    "operations": [],
                    "location": {"line": line_num, "column": 1}
                }
                in_table = False
                table_fields = []
                continue

            # Parse model header: ## Model: Name
            if stripped.startswith('## Model:'):
                if current_entity:
                    if current_section == 'model':
                        current_entity['fields'] = table_fields
                        result['models'].append(current_entity)
                    elif current_section == 'service':
                        result['services'].append(current_entity)

                model_name = stripped[9:].strip()
                current_section = 'model'
                current_entity = {
                    "name": model_name,
                    "description": None,
                    "fields": [],
                    "location": {"line": line_num, "column": 1}
                }
                in_table = False
                table_fields = []
                continue

            # Parse operation header: ## Operation: METHOD /path
            if stripped.startswith('## Operation:'):
                if current_entity:
                    if current_section == 'model':
                        current_entity['fields'] = table_fields
                        result['models'].append(current_entity)
                    elif current_section == 'service':
                        result['services'].append(current_entity)
                    elif current_section == 'operation':
                        result['operations'].append(current_entity)

                op_def = stripped[13:].strip()
                method, path = self._parse_operation_def(op_def)
                current_section = 'operation'
                current_entity = {
                    "method": method,
                    "path": path,
                    "summary": None,
                    "description": None,
                    "request_model": None,
                    "response_model": None,
                    "error_refs": [],
                    "tags": [],
                    "location": {"line": line_num, "column": 1}
                }
                in_table = False
                table_fields = []
                continue

            # Parse error header: ## Error: CODE Name
            if stripped.startswith('## Error:'):
                if current_entity:
                    if current_section == 'model':
                        current_entity['fields'] = table_fields
                        result['models'].append(current_entity)
                    elif current_section == 'service':
                        result['services'].append(current_entity)
                    elif current_section == 'operation':
                        result['operations'].append(current_entity)
                    elif current_section == 'error':
                        result['errors'].append(current_entity)

                err_def = stripped[9:].strip()
                status_code, name = self._parse_error_def(err_def)
                current_section = 'error'
                current_entity = {
                    "status_code": status_code,
                    "name": name,
                    "description": None,
                    "message": None,
                    "location": {"line": line_num, "column": 1}
                }
                in_table = False
                table_fields = []
                continue

            # Parse service properties (version, base_path)
            if current_section == 'service' and current_entity:
                if stripped.startswith('version:'):
                    current_entity['version'] = stripped[8:].strip()
                elif stripped.startswith('base_path:'):
                    current_entity['base_path'] = stripped[10:].strip()
                elif stripped and not stripped.startswith('|') and not stripped.startswith('#'):
                    if current_entity['description'] is None:
                        current_entity['description'] = stripped
                    else:
                        current_entity['description'] += ' ' + stripped

            # Parse model description, list items, and table
            if current_section == 'model' and current_entity:
                # Natural language list syntax: - field (type, required) - description
                if stripped.startswith('- ') and '(' in stripped:
                    field = self._parse_list_field(stripped, line_num)
                    if field:
                        table_fields.append(field)
                elif stripped.startswith('|'):
                    # Table row
                    if '---' in stripped:
                        in_table = True
                        continue
                    if in_table:
                        field = self._parse_table_row(stripped, line_num)
                        if field:
                            table_fields.append(field)
                    else:
                        # Header row, skip
                        in_table = False
                elif stripped and not stripped.startswith('#'):
                    if current_entity['description'] is None:
                        current_entity['description'] = stripped
                    else:
                        current_entity['description'] += ' ' + stripped

            # Parse operation properties
            if current_section == 'operation' and current_entity:
                # Natural language syntax: Body: ModelName, Returns: ModelName
                if stripped.startswith('Body:'):
                    current_entity['request_model'] = stripped[5:].strip()
                elif stripped.startswith('Returns:'):
                    current_entity['response_model'] = stripped[8:].strip()
                # Legacy syntax: **Request**: and **Response**:
                elif stripped.startswith('**Request**:'):
                    current_entity['request_model'] = stripped[12:].strip()
                elif stripped.startswith('**Response**:'):
                    current_entity['response_model'] = stripped[13:].strip()
                elif stripped.startswith('**Errors**:'):
                    current_entity['error_refs'] = [e.strip() for e in stripped[11:].split(',')]
                elif stripped and not stripped.startswith('|') and not stripped.startswith('#') and not stripped.startswith('**'):
                    if current_entity['description'] is None:
                        current_entity['description'] = stripped
                    else:
                        current_entity['description'] += ' ' + stripped

            # Parse error description
            if current_section == 'error' and current_entity:
                if stripped and not stripped.startswith('#'):
                    if current_entity['description'] is None:
                        current_entity['description'] = stripped
                    else:
                        current_entity['description'] += ' ' + stripped

        # Add final entity
        if current_entity:
            if current_section == 'service':
                result['services'].append(current_entity)
            elif current_section == 'model':
                current_entity['fields'] = table_fields
                result['models'].append(current_entity)
            elif current_section == 'operation':
                result['operations'].append(current_entity)
            elif current_section == 'error':
                result['errors'].append(current_entity)

        # Calculate counts
        result['valid_entities'] = (
            len(result['services']) +
            len(result['models']) +
            len(result['operations']) +
            len(result['errors'])
        )
        result['total_errors'] = len(result['parse_errors'])

        return result

    def _empty_result(self) -> dict[str, Any]:
        """Return empty parse result."""
        return {
            "services": [],
            "models": [],
            "operations": [],
            "errors": [],
            "parse_errors": [],
            "valid_entities": 0,
            "total_errors": 0,
        }

    def _parse_operation_def(self, op_def: str) -> tuple[str, str]:
        """Parse operation definition like 'GET /users'."""
        parts = op_def.split(None, 1)
        if len(parts) >= 2:
            return parts[0].upper(), parts[1]
        elif len(parts) == 1:
            return parts[0].upper(), "/"
        return "GET", "/"

    def _parse_error_def(self, err_def: str) -> tuple[int, str]:
        """Parse error definition like '404 NotFound'."""
        parts = err_def.split(None, 1)
        if len(parts) >= 2:
            try:
                return int(parts[0]), parts[1]
            except ValueError:
                return 500, err_def
        elif len(parts) == 1:
            try:
                return int(parts[0]), "Error"
            except ValueError:
                return 500, parts[0]
        return 500, "Error"

    def _parse_table_row(self, row: str, line_num: int) -> Optional[dict[str, Any]]:
        """Parse a table row like '| name | type | required |'."""
        # Remove leading/trailing pipes and split
        cells = [c.strip() for c in row.strip('|').split('|')]

        if len(cells) >= 2:
            name = cells[0].strip()
            field_type = cells[1].strip() if len(cells) > 1 else "string"
            required_str = cells[2].strip().lower() if len(cells) > 2 else "true"
            description = cells[3].strip() if len(cells) > 3 else None

            # Skip header row
            if name.lower() == 'name' or '---' in name:
                return None

            required = required_str in ('true', 'yes', '1', 'required')

            return {
                "name": name,
                "type": field_type,
                "required": required,
                "description": description,
                "constraints": {},
                "location": {"line": line_num, "column": 1}
            }

        return None

    def _parse_list_field(self, line: str, line_num: int) -> Optional[dict[str, Any]]:
        """Parse a natural language field like '- name (string, required) - description'."""
        import re

        # Pattern: - field_name (type_info) [- description]
        pattern = re.compile(r'^-\s+(\w+)\s*\(([^)]+)\)(?:\s*-\s*(.*))?$')
        match = pattern.match(line.strip())

        if not match:
            return None

        field_name = match.group(1)
        type_info = match.group(2).strip()
        description = match.group(3).strip() if match.group(3) else None

        # Parse type and required flag from type_info
        required = False
        field_type = type_info

        if "," in type_info:
            parts = [p.strip() for p in type_info.split(",")]
            field_type = parts[0]
            for part in parts[1:]:
                if part.lower() == "required":
                    required = True

        return {
            "name": field_name,
            "type": field_type,
            "required": required,
            "description": description,
            "constraints": {},
            "location": {"line": line_num, "column": 1}
        }


# Singleton instance
_parser_service: Optional[ParserService] = None


def get_parser_service() -> ParserService:
    """Get or create parser service instance."""
    global _parser_service
    if _parser_service is None:
        _parser_service = ParserService()
    return _parser_service
