"""
T007: OAS to CSV Exporter Service.

Converts OpenAPI specification documents to CSV data.
Supports multiple profile levels (Basic, Advanced, Technical, Expert).

Feature 004 - Form-Based OpenAPI Builder
"""

import csv
from typing import Dict, List, Any, Optional, IO
from enum import Enum
from io import StringIO


class CSVProfile(Enum):
    """Profile levels for CSV representation."""

    BASIC = "basic"  # Minimal fields for business users
    ADVANCED = "advanced"  # Additional fields for developers
    TECHNICAL = "technical"  # Complex structures (allOf, oneOf, etc.)
    EXPERT = "expert"  # Full OAS expressiveness + JSON columns


class ExportError(Exception):
    """Error during OAS to CSV export."""

    pass


class OASToCSVExporter:
    """
    Converts OpenAPI specifications to CSV data.

    Supports export from OAS documents to CSV profile representations.
    """

    def __init__(self, profile: CSVProfile = CSVProfile.BASIC):
        """Initialize exporter with profile."""
        self.profile = profile

    def export_to_file(
        self,
        oas: Dict[str, Any],
        csv_file: IO,
        data_type: str = "api-info",
    ) -> None:
        """
        Export OAS to CSV file.

        Args:
            oas: OpenAPI specification dictionary
            csv_file: File object to write CSV data
            data_type: Type of OAS element being exported
                      (api-info, servers, operations, models, etc.)
        """
        csv_string = self.export_to_string(oas, data_type)
        csv_file.write(csv_string)

    def export_to_string(
        self,
        oas: Dict[str, Any],
        data_type: str = "api-info",
    ) -> str:
        """
        Export OAS to CSV string.

        Args:
            oas: OpenAPI specification dictionary
            data_type: Type of OAS element

        Returns:
            CSV content as string
        """
        if data_type == "api-info":
            return self._export_api_info(oas)
        elif data_type == "servers":
            return self._export_servers(oas)
        elif data_type == "models":
            return self._export_models(oas)
        elif data_type == "operations":
            return self._export_operations(oas)
        else:
            raise ExportError(f"Unknown data type: {data_type}")

    def _export_api_info(self, oas: Dict[str, Any]) -> str:
        """Export API info to CSV."""
        info = oas.get("info", {})

        # Prepare row
        row = {
            "title": info.get("title", ""),
            "version": info.get("version", ""),
        }

        # Add optional fields
        if "description" in info:
            row["description"] = info["description"]

        if "termsOfService" in info:
            row["termsOfService"] = info["termsOfService"]

        contact = info.get("contact", {})
        if contact:
            if "name" in contact:
                row["contact_name"] = contact["name"]
            if "email" in contact:
                row["contact_email"] = contact["email"]
            if "url" in contact:
                row["contact_url"] = contact["url"]

        license_obj = info.get("license", {})
        if license_obj:
            if "name" in license_obj:
                row["license_name"] = license_obj["name"]
            if "url" in license_obj:
                row["license_url"] = license_obj["url"]

        return self._rows_to_csv([row])

    def _export_servers(self, oas: Dict[str, Any]) -> str:
        """Export servers to CSV."""
        servers = oas.get("servers", [])
        rows = []

        for server in servers:
            row = {
                "url": server.get("url", ""),
            }

            if "description" in server:
                row["description"] = server["description"]

            # Variables support (advanced)
            if self.profile in (CSVProfile.ADVANCED, CSVProfile.TECHNICAL, CSVProfile.EXPERT):
                variables = server.get("variables", {})
                for var_name, var_config in variables.items():
                    for field, value in var_config.items():
                        row[f"variables_{var_name}_{field}"] = value

            rows.append(row)

        return self._rows_to_csv(rows)

    def _export_models(self, oas: Dict[str, Any]) -> str:
        """Export models/schemas to CSV."""
        components = oas.get("components", {})
        schemas = components.get("schemas", {})
        rows = []

        for model_name, schema in schemas.items():
            schema_type = schema.get("type", "object")
            description = schema.get("description", "")

            # Get required fields if present
            required_fields = schema.get("required", [])
            required_str = ";".join(required_fields) if required_fields else ""

            # Export properties
            properties = schema.get("properties", {})
            if properties:
                for prop_name, prop_schema in properties.items():
                    prop_type = prop_schema.get("type", "string")
                    prop_description = prop_schema.get("description", "")

                    row = {
                        "model_name": model_name,
                        "type": schema_type,
                        "description": description,
                        "property_name": prop_name,
                        "property_type": prop_type,
                        "property_description": prop_description,
                    }

                    if required_str:
                        row["required_fields"] = required_str

                    # Format support (technical)
                    if self.profile in (CSVProfile.TECHNICAL, CSVProfile.EXPERT):
                        if "format" in prop_schema:
                            row["property_format"] = prop_schema["format"]

                    rows.append(row)
            else:
                # Schema with no properties
                row = {
                    "model_name": model_name,
                    "type": schema_type,
                    "description": description,
                }
                if required_str:
                    row["required_fields"] = required_str
                rows.append(row)

        return self._rows_to_csv(rows)

    def _export_operations(self, oas: Dict[str, Any]) -> str:
        """Export operations/paths to CSV."""
        paths = oas.get("paths", {})
        rows = []

        for path_name, path_item in paths.items():
            for method, operation in path_item.items():
                # Skip non-operation fields
                if method.startswith("x-") or method in ("summary", "description", "parameters", "servers"):
                    continue

                method = method.lower()
                row = {
                    "path": path_name,
                    "method": method,
                    "summary": operation.get("summary", ""),
                }

                # Add optional fields
                if "description" in operation:
                    row["description"] = operation["description"]

                tags = operation.get("tags", [])
                if tags:
                    row["tags"] = ";".join(tags)

                if "operationId" in operation:
                    row["operationId"] = operation["operationId"]

                if operation.get("deprecated", False):
                    row["deprecated"] = "true"

                # Response description
                responses = operation.get("responses", {})
                if "200" in responses:
                    response_200 = responses["200"]
                    row["response_200_description"] = response_200.get("description", "Success")
                elif responses:
                    # Use first response
                    first_code = list(responses.keys())[0]
                    first_response = responses[first_code]
                    row["response_200_description"] = first_response.get("description", "Success")
                else:
                    row["response_200_description"] = "Success"

                # Parameters (advanced)
                if self.profile in (CSVProfile.ADVANCED, CSVProfile.TECHNICAL, CSVProfile.EXPERT):
                    parameters = operation.get("parameters", [])
                    if parameters:
                        param_names = []
                        for param in parameters:
                            param_name = param.get("name", "")
                            param_names.append(param_name)

                            # Safe parameter name for CSV columns
                            safe_param = param_name.replace("-", "_").replace(" ", "_")

                            row[f"param_{safe_param}_in"] = param.get("in", "query")
                            if "description" in param:
                                row[f"param_{safe_param}_description"] = param["description"]

                            schema = param.get("schema", {})
                            row[f"param_{safe_param}_type"] = schema.get("type", "string")

                            if param.get("required", False):
                                row[f"param_{safe_param}_required"] = "true"

                        if param_names:
                            row["parameter_names"] = ";".join(param_names)

                rows.append(row)

        return self._rows_to_csv(rows)

    def _rows_to_csv(self, rows: List[Dict[str, str]]) -> str:
        """Convert list of dictionaries to CSV string."""
        if not rows:
            return ""

        # Collect all fieldnames
        fieldnames = set()
        for row in rows:
            fieldnames.update(row.keys())

        fieldnames = sorted(list(fieldnames))

        # Write to StringIO
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

        return output.getvalue()


class BulkOASToCSVExporter:
    """
    Bulk exporter for OAS to multiple CSV files.

    Orchestrates export of OAS documents into multiple CSV files.
    """

    def __init__(self, profile: CSVProfile = CSVProfile.BASIC):
        """Initialize bulk exporter."""
        self.profile = profile
        self.exporter = OASToCSVExporter(profile)

    def export_oas(
        self,
        oas: Dict[str, Any],
    ) -> Dict[str, str]:
        """
        Export OAS to multiple CSV files.

        Args:
            oas: Complete OAS document

        Returns:
            Dictionary mapping data type to CSV content string
        """
        csvs = {}

        # Export api-info
        try:
            csvs["api-info"] = self.exporter.export_to_string(oas, "api-info")
        except Exception:
            pass

        # Export servers if present
        if "servers" in oas:
            try:
                csvs["servers"] = self.exporter.export_to_string(oas, "servers")
            except Exception:
                pass

        # Export models if present
        if "components" in oas and "schemas" in oas.get("components", {}):
            try:
                csvs["models"] = self.exporter.export_to_string(oas, "models")
            except Exception:
                pass

        # Export operations if present
        if "paths" in oas:
            try:
                csvs["operations"] = self.exporter.export_to_string(oas, "operations")
            except Exception:
                pass

        return csvs
