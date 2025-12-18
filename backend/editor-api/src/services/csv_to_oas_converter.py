"""
T006: CSV to OAS Converter Service.

Converts CSV data to OpenAPI specification documents.
Supports multiple profile levels (Basic, Advanced, Technical, Expert).

Feature 004 - Form-Based OpenAPI Builder
"""

import csv
from typing import Dict, List, Any, Optional, IO
from enum import Enum


class CSVProfile(Enum):
    """Profile levels for CSV representation."""

    BASIC = "basic"  # Minimal fields for business users
    ADVANCED = "advanced"  # Additional fields for developers
    TECHNICAL = "technical"  # Complex structures (allOf, oneOf, etc.)
    EXPERT = "expert"  # Full OAS expressiveness + JSON columns


class ConversionError(Exception):
    """Error during CSV to OAS conversion."""

    pass


class CSVRow:
    """Represents a single CSV row."""

    def __init__(self, data: Dict[str, str]):
        """Initialize CSV row."""
        self.data = data

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get value by key."""
        return self.data.get(key, default)

    def get_bool(self, key: str, default: bool = False) -> bool:
        """Get boolean value."""
        value = self.data.get(key, "").strip().lower()
        if value in ("true", "yes", "1", "on"):
            return True
        elif value in ("false", "no", "0", "off"):
            return False
        return default

    def get_list(self, key: str, delimiter: str = ";") -> List[str]:
        """Get list value (semicolon-separated by default)."""
        value = self.data.get(key, "").strip()
        if not value:
            return []
        return [v.strip() for v in value.split(delimiter)]


class CSVToOASConverter:
    """
    Converts CSV data to OpenAPI specifications.

    Supports conversion from CSV profile representations to full OAS documents.
    """

    def __init__(self, profile: CSVProfile = CSVProfile.BASIC):
        """Initialize converter with profile."""
        self.profile = profile

    def convert_from_file(
        self,
        csv_file: IO,
        data_type: str = "api-info",
    ) -> Dict[str, Any]:
        """
        Convert CSV file to OAS structure.

        Args:
            csv_file: File object containing CSV data
            data_type: Type of OAS element being converted
                      (api-info, servers, operations, models, etc.)

        Returns:
            OAS structure (or portion thereof)
        """
        reader = csv.DictReader(csv_file)
        rows = [CSVRow(row) for row in reader]

        if data_type == "api-info":
            return self._convert_api_info(rows)
        elif data_type == "servers":
            return self._convert_servers(rows)
        elif data_type == "models":
            return self._convert_models(rows)
        elif data_type == "operations":
            return self._convert_operations(rows)
        else:
            raise ConversionError(f"Unknown data type: {data_type}")

    def convert_from_string(
        self,
        csv_string: str,
        data_type: str = "api-info",
    ) -> Dict[str, Any]:
        """
        Convert CSV string to OAS structure.

        Args:
            csv_string: CSV content as string
            data_type: Type of OAS element

        Returns:
            OAS structure
        """
        from io import StringIO

        csv_file = StringIO(csv_string)
        return self.convert_from_file(csv_file, data_type)

    def _convert_api_info(self, rows: List[CSVRow]) -> Dict[str, Any]:
        """Convert API info CSV to OAS info object."""
        if not rows:
            raise ConversionError("No rows in API info CSV")

        row = rows[0]  # Use first row for API info

        info = {
            "title": row.get("title", "Unknown API"),
            "version": row.get("version", "1.0.0"),
        }

        # Add optional fields
        description = row.get("description")
        if description:
            info["description"] = description

        terms_of_service = row.get("termsOfService")
        if terms_of_service:
            info["termsOfService"] = terms_of_service

        contact_name = row.get("contact_name")
        contact_email = row.get("contact_email")
        contact_url = row.get("contact_url")

        if contact_name or contact_email or contact_url:
            contact = {}
            if contact_name:
                contact["name"] = contact_name
            if contact_email:
                contact["email"] = contact_email
            if contact_url:
                contact["url"] = contact_url
            info["contact"] = contact

        license_name = row.get("license_name")
        if license_name:
            license_obj = {"name": license_name}
            license_url = row.get("license_url")
            if license_url:
                license_obj["url"] = license_url
            info["license"] = license_obj

        return {"info": info}

    def _convert_servers(self, rows: List[CSVRow]) -> Dict[str, Any]:
        """Convert servers CSV to OAS servers array."""
        servers = []

        for row in rows:
            url = row.get("url")
            if not url:
                continue

            server = {"url": url}

            description = row.get("description")
            if description:
                server["description"] = description

            # Variables support (advanced)
            if self.profile in (CSVProfile.ADVANCED, CSVProfile.TECHNICAL, CSVProfile.EXPERT):
                variables = self._parse_server_variables(row)
                if variables:
                    server["variables"] = variables

            servers.append(server)

        return {"servers": servers}

    def _parse_server_variables(self, row: CSVRow) -> Dict[str, Any]:
        """Parse server variables from CSV row."""
        variables = {}

        # Look for variable definitions (e.g., variables_basePath_default)
        for key, value in row.data.items():
            if key.startswith("variables_") and value:
                parts = key.split("_")
                if len(parts) >= 3:
                    var_name = parts[1]
                    var_field = parts[2]
                    if var_name not in variables:
                        variables[var_name] = {}
                    variables[var_name][var_field] = value

        return variables if variables else {}

    def _convert_models(self, rows: List[CSVRow]) -> Dict[str, Any]:
        """Convert models CSV to OAS schemas."""
        schemas = {}

        current_model = None
        current_schema = None

        for row in rows:
            model_name = row.get("model_name")

            # New model definition
            if model_name and model_name != current_model:
                if current_model and current_schema:
                    schemas[current_model] = current_schema

                current_model = model_name
                current_schema = {
                    "type": row.get("type", "object"),
                    "description": row.get("description", ""),
                }

                # Add required fields
                required_fields = row.get_list("required_fields")
                if required_fields:
                    current_schema["required"] = required_fields

            # Add property to current model
            if current_model and current_schema:
                prop_name = row.get("property_name")
                if prop_name:
                    properties = current_schema.setdefault("properties", {})
                    properties[prop_name] = {
                        "type": row.get("property_type", "string"),
                    }

                    description = row.get("property_description")
                    if description:
                        properties[prop_name]["description"] = description

                    if self.profile in (CSVProfile.TECHNICAL, CSVProfile.EXPERT):
                        format_val = row.get("property_format")
                        if format_val:
                            properties[prop_name]["format"] = format_val

        # Add last model
        if current_model and current_schema:
            schemas[current_model] = current_schema

        return {"components": {"schemas": schemas}} if schemas else {}

    def _convert_operations(self, rows: List[CSVRow]) -> Dict[str, Any]:
        """Convert operations CSV to OAS paths."""
        paths = {}

        for row in rows:
            path_name = row.get("path")
            method = row.get("method", "get").lower()

            if not path_name:
                continue

            if path_name not in paths:
                paths[path_name] = {}

            operation = {
                "summary": row.get("summary", ""),
                "responses": {
                    "200": {"description": row.get("response_200_description", "Success")}
                },
            }

            # Add optional fields
            description = row.get("description")
            if description:
                operation["description"] = description

            tags = row.get_list("tags")
            if tags:
                operation["tags"] = tags

            operation_id = row.get("operationId")
            if operation_id:
                operation["operationId"] = operation_id

            # Deprecated flag
            if row.get_bool("deprecated"):
                operation["deprecated"] = True

            # Parameters (advanced)
            if self.profile in (CSVProfile.ADVANCED, CSVProfile.TECHNICAL, CSVProfile.EXPERT):
                parameters = self._parse_parameters(row)
                if parameters:
                    operation["parameters"] = parameters

            paths[path_name][method] = operation

        return {"paths": paths} if paths else {}

    def _parse_parameters(self, row: CSVRow) -> List[Dict[str, Any]]:
        """Parse parameters from CSV row."""
        parameters = []

        # Look for parameter definitions
        param_names = row.get_list("parameter_names")
        for param_name in param_names:
            if not param_name:
                continue

            # Sanitize parameter name for CSV column lookup
            safe_param = param_name.replace("-", "_").replace(" ", "_")

            parameter = {
                "name": param_name,
                "in": row.get(f"param_{safe_param}_in", "query"),
                "schema": {"type": row.get(f"param_{safe_param}_type", "string")},
            }

            description = row.get(f"param_{safe_param}_description")
            if description:
                parameter["description"] = description

            required = row.get_bool(f"param_{safe_param}_required")
            if required:
                parameter["required"] = True

            parameters.append(parameter)

        return parameters

    def create_minimal_oas(
        self,
        title: str = "API",
        version: str = "1.0.0",
    ) -> Dict[str, Any]:
        """
        Create a minimal OAS 3.0 document.

        Args:
            title: API title
            version: API version

        Returns:
            Minimal OAS document
        """
        return {
            "openapi": "3.0.0",
            "info": {"title": title, "version": version},
            "paths": {},
        }

    def merge_oas_parts(
        self,
        base_oas: Optional[Dict[str, Any]],
        *parts: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Merge multiple OAS parts into single document.

        Args:
            base_oas: Base OAS document (or None to create minimal)
            *parts: OAS parts to merge (info, servers, paths, components, etc.)

        Returns:
            Merged OAS document
        """
        if base_oas is None:
            result = self.create_minimal_oas()
        else:
            from copy import deepcopy

            result = deepcopy(base_oas)

        for part in parts:
            self._deep_merge(result, part)

        return result

    def _deep_merge(
        self,
        target: Dict[str, Any],
        source: Dict[str, Any],
    ) -> None:
        """Deep merge source dict into target dict."""
        for key, value in source.items():
            if key in target and isinstance(target[key], dict) and isinstance(value, dict):
                self._deep_merge(target[key], value)
            else:
                target[key] = value


class BulkCSVConverter:
    """
    Bulk converter for multiple CSV files to complete OAS.

    Orchestrates conversion of multiple CSV files into a single OAS document.
    """

    def __init__(self, profile: CSVProfile = CSVProfile.BASIC):
        """Initialize bulk converter."""
        self.profile = profile
        self.converter = CSVToOASConverter(profile)

    def convert_csvs(
        self,
        csv_files: Dict[str, str],  # type -> csv_string
    ) -> Dict[str, Any]:
        """
        Convert multiple CSV files to OAS.

        Args:
            csv_files: Dictionary mapping data type to CSV content string

        Returns:
            Complete OAS document
        """
        oas = self.converter.create_minimal_oas()

        # Process in order to build OAS progressively
        for data_type in ["api-info", "servers", "models", "operations"]:
            if data_type in csv_files:
                try:
                    part = self.converter.convert_from_string(
                        csv_files[data_type],
                        data_type=data_type,
                    )
                    oas = self.converter.merge_oas_parts(oas, part)
                except ConversionError:
                    # Skip failed conversions
                    pass

        return oas
