"""
T015: Export service for OpenAPI generation.

Parses DSL content and generates OpenAPI specifications.
Supports OpenAPI 3.0 and 3.1 in YAML and JSON formats.

Feature 003 - Natural Language DSL & OpenAPI Export.
"""

from typing import Literal

from src.services.parser_service import ParserService
from src.utils.openapi_generator import OpenAPIGenerator


class ExportService:
    """
    Service for exporting DSL content to OpenAPI specifications.

    Combines parsing and OpenAPI generation into a single workflow.
    """

    def __init__(self):
        """Initialize export service."""
        self.parser_service = ParserService()

    def export_openapi(
        self,
        content: str,
        format: Literal["yaml", "json"] = "yaml",
        version: Literal["3.0", "3.1"] = "3.0"
    ) -> str:
        """
        Export DSL content to OpenAPI specification.

        Args:
            content: DSL content string
            format: Output format ("yaml" or "json")
            version: OpenAPI version ("3.0" or "3.1")

        Returns:
            OpenAPI specification as string (YAML or JSON)

        Raises:
            ValueError: If content cannot be parsed
        """
        # Parse the DSL content
        parsed = self.parser_service.parse(content)

        # Map version to full version string
        version_map = {
            "3.0": "3.0.3",
            "3.1": "3.1.0",
        }
        full_version = version_map.get(version, "3.0.3")

        # Create generator with specified version
        generator = OpenAPIGenerator(version=full_version)

        # Generate OpenAPI spec in requested format
        if format == "json":
            return generator.to_json(parsed)
        else:
            return generator.to_yaml(parsed)

    def get_content_type(self, format: Literal["yaml", "json"]) -> str:
        """
        Get the appropriate Content-Type header for the format.

        Args:
            format: Output format ("yaml" or "json")

        Returns:
            Content-Type header value
        """
        if format == "json":
            return "application/json"
        else:
            return "application/x-yaml"
