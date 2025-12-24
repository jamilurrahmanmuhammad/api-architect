"""
OpenAPI Generator for DSL Export.

Generates OpenAPI 3.0/3.1 specifications from parsed DSL requirements.
Transforms service, models, operations, and errors into valid OpenAPI spec.

Feature 003 - Natural Language DSL & OpenAPI Export.
"""

import json
import re
from typing import Any, Optional

import yaml

from .example_generator import ExampleGenerator


class OpenAPIGenerator:
    """
    Generates OpenAPI specifications from parsed DSL requirements.

    Transforms:
    - Service -> info + servers
    - Models -> components/schemas
    - Operations -> paths
    - Errors -> components/responses
    """

    # Primitive type mappings to OpenAPI types
    TYPE_MAPPINGS = {
        "string": "string",
        "integer": "integer",
        "number": "number",
        "boolean": "boolean",
        "date": "string",  # with format: date
        "datetime": "string",  # with format: date-time
        "time": "string",  # with format: time
        "object": "object",
        "array": "array",
    }

    # Format mappings for special types
    FORMAT_MAPPINGS = {
        "date": "date",
        "datetime": "date-time",
        "time": "time",
    }

    def __init__(self, version: str = "3.0.3"):
        """
        Initialize the OpenAPI generator.

        Args:
            version: OpenAPI specification version (default: 3.0.3)
        """
        self.openapi_version = version
        self.example_generator = ExampleGenerator()

    def generate(self, parsed: dict) -> dict:
        """
        Generate OpenAPI specification from parsed DSL.

        Args:
            parsed: Parsed DSL with services, models, operations, errors

        Returns:
            OpenAPI specification as a dictionary
        """
        spec: dict[str, Any] = {
            "openapi": self.openapi_version,
        }

        # Build info section from service
        services = parsed.get("services", [])
        if services:
            service = services[0]
            spec["info"] = self._build_info(service)
            spec["servers"] = self._build_servers(service)

        # Build paths from operations
        operations = parsed.get("operations", [])
        if operations:
            spec["paths"] = self._build_paths(operations)
        else:
            spec["paths"] = {}

        # Build components
        components: dict[str, Any] = {}

        # Build schemas from models
        models = parsed.get("models", [])
        if models:
            components["schemas"] = self._build_schemas(models)

        # Build responses from errors
        errors = parsed.get("errors", [])
        if errors:
            components["responses"] = self._build_responses(errors)

        if components:
            spec["components"] = components

        return spec

    def to_yaml(self, parsed: dict) -> str:
        """
        Generate OpenAPI specification as YAML string.

        Args:
            parsed: Parsed DSL with services, models, operations, errors

        Returns:
            OpenAPI specification as YAML string
        """
        spec = self.generate(parsed)
        return yaml.dump(spec, default_flow_style=False, sort_keys=False)

    def to_json(self, parsed: dict) -> str:
        """
        Generate OpenAPI specification as JSON string.

        Args:
            parsed: Parsed DSL with services, models, operations, errors

        Returns:
            OpenAPI specification as JSON string
        """
        spec = self.generate(parsed)
        return json.dumps(spec, indent=2)

    def _build_info(self, service: dict) -> dict:
        """Build OpenAPI info section from service definition."""
        info = {
            "title": service.get("title") or service.get("name", "API"),
            "version": service.get("version", "1.0.0"),
        }

        description = service.get("description")
        if description:
            info["description"] = description

        return info

    def _build_servers(self, service: dict) -> list:
        """Build OpenAPI servers section from service definition."""
        base_path = service.get("base_path", "/")
        return [{"url": base_path}]

    def _build_paths(self, operations: list) -> dict:
        """Build OpenAPI paths section from operations."""
        paths: dict[str, dict] = {}

        for operation in operations:
            path = operation.get("path", "/")
            method = operation.get("method", "GET").lower()

            if path not in paths:
                paths[path] = {}

            paths[path][method] = self._build_operation(operation)

        return paths

    def _build_operation(self, operation: dict) -> dict:
        """Build OpenAPI operation object."""
        op: dict[str, Any] = {}

        # Summary
        summary = operation.get("summary")
        if summary:
            op["summary"] = summary

        # Description
        description = operation.get("description")
        if description:
            op["description"] = description

        # Path parameters
        path = operation.get("path", "")
        parameters = self._extract_path_parameters(path)
        if parameters:
            op["parameters"] = parameters

        # Request body (for POST, PUT, PATCH)
        method = operation.get("method", "").upper()
        request_model = operation.get("request_model")
        if request_model and method in ("POST", "PUT", "PATCH"):
            op["requestBody"] = self._build_request_body(request_model)

        # Responses
        response_model = operation.get("response_model")
        op["responses"] = self._build_operation_responses(response_model)

        return op

    def _extract_path_parameters(self, path: str) -> list:
        """Extract path parameters from path template."""
        parameters = []
        # Match {paramName} patterns
        param_pattern = re.compile(r"\{(\w+)\}")
        matches = param_pattern.findall(path)

        for param_name in matches:
            parameters.append({
                "name": param_name,
                "in": "path",
                "required": True,
                "schema": {"type": "string"},
            })

        return parameters

    def _build_request_body(self, model_name: str) -> dict:
        """Build OpenAPI requestBody object."""
        return {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {"$ref": f"#/components/schemas/{model_name}"}
                }
            }
        }

    def _build_operation_responses(self, response_model: Optional[str]) -> dict:
        """Build OpenAPI responses object for an operation."""
        responses = {
            "200": {
                "description": "Successful response",
            }
        }

        if response_model:
            responses["200"]["content"] = {
                "application/json": {
                    "schema": self._build_response_schema(response_model)
                }
            }

        return responses

    def _build_response_schema(self, model_name: str) -> dict:
        """Build schema reference for response model."""
        # Handle array responses (e.g., "Pet[]")
        if model_name.endswith("[]"):
            item_type = model_name[:-2]
            return {
                "type": "array",
                "items": {"$ref": f"#/components/schemas/{item_type}"}
            }

        return {"$ref": f"#/components/schemas/{model_name}"}

    def _build_schemas(self, models: list) -> dict:
        """Build OpenAPI schemas from model definitions."""
        schemas = {}

        for model in models:
            name = model.get("name", "Unknown")
            schemas[name] = self._build_schema(model)

        return schemas

    def _build_schema(self, model: dict) -> dict:
        """Build OpenAPI schema object from model definition."""
        schema: dict[str, Any] = {
            "type": "object",
        }

        description = model.get("description")
        if description:
            schema["description"] = description

        fields = model.get("fields", [])
        if fields:
            properties = {}
            required = []

            for field in fields:
                field_name = field.get("name", "field")
                field_type = field.get("type", "string")
                is_required = field.get("required", False)

                properties[field_name] = self._build_property(field_name, field_type, field)

                if is_required:
                    required.append(field_name)

            schema["properties"] = properties

            if required:
                schema["required"] = required

        return schema

    def _build_property(self, field_name: str, field_type: str, field: dict) -> dict:
        """Build OpenAPI property object from field definition."""
        prop: dict[str, Any] = {}

        # Handle array types
        if field_type.endswith("[]"):
            element_type = field_type[:-2]
            prop["type"] = "array"
            prop["items"] = self._build_items(element_type)
        # Handle model references (PascalCase, non-primitive)
        elif self._is_model_reference(field_type):
            prop["$ref"] = f"#/components/schemas/{field_type}"
        # Handle primitive types
        else:
            openapi_type = self.TYPE_MAPPINGS.get(field_type, "string")
            prop["type"] = openapi_type

            # Add format for special types
            format_value = self.FORMAT_MAPPINGS.get(field_type)
            if format_value:
                prop["format"] = format_value

        # Add description
        description = field.get("description")
        if description:
            prop["description"] = description

        # Add example (skip for $ref properties)
        if "$ref" not in prop:
            example = self.example_generator.generate_example(field_name, field_type)
            if example is not None:
                # OpenAPI 3.1 uses 'examples' array, 3.0 uses 'example' singular
                if self._is_openapi_31():
                    prop["examples"] = [example]
                else:
                    prop["example"] = example

        return prop

    def _is_openapi_31(self) -> bool:
        """Check if generating OpenAPI 3.1 specification."""
        return self.openapi_version.startswith("3.1")

    def _build_items(self, element_type: str) -> dict:
        """Build OpenAPI items schema for arrays."""
        if self._is_model_reference(element_type):
            return {"$ref": f"#/components/schemas/{element_type}"}

        openapi_type = self.TYPE_MAPPINGS.get(element_type, "string")
        return {"type": openapi_type}

    def _is_model_reference(self, field_type: str) -> bool:
        """Check if type is a model reference (PascalCase, non-primitive)."""
        primitives = set(self.TYPE_MAPPINGS.keys())
        return field_type not in primitives and field_type[0].isupper()

    def _build_responses(self, errors: list) -> dict:
        """Build OpenAPI responses from error definitions."""
        responses = {}

        for error in errors:
            name = error.get("name", "Error")
            responses[name] = self._build_error_response(error)

        return responses

    def _build_error_response(self, error: dict) -> dict:
        """Build OpenAPI response object from error definition."""
        response = {
            "description": error.get("description", "Error response"),
        }

        # Add standard error content
        response["content"] = {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "error": {"type": "string"},
                        "message": {"type": "string"},
                        "status": {"type": "integer"},
                    }
                }
            }
        }

        return response
