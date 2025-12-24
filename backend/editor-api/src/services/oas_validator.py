"""
T004: OAS Validator Helper Service.

Provides validation for OpenAPI Specification:
- OAS 3.0.x and 3.1.x format validation
- Required field checking
- Reference ($ref) validation
- Schema property validation

Feature 004 - Form-Based OpenAPI Builder
"""

from typing import Dict, List, Any, Optional, Tuple
import re
import json
import yaml


class ValidationError:
    """Represents a validation error."""

    def __init__(
        self,
        path: str,
        message: str,
        error_type: str = "error",
        severity: str = "error",
    ):
        """Initialize validation error."""
        self.path = path
        self.message = message
        self.error_type = error_type
        self.severity = severity

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "path": self.path,
            "message": self.message,
            "type": self.error_type,
            "severity": self.severity,
        }

    def __repr__(self) -> str:
        """String representation."""
        return f"ValidationError({self.path}: {self.message})"


class ValidationResult:
    """Result of OAS validation."""

    def __init__(
        self,
        is_valid: bool,
        oas_version: Optional[str] = None,
        errors: Optional[List[ValidationError]] = None,
        warnings: Optional[List[ValidationError]] = None,
    ):
        """Initialize validation result."""
        self.is_valid = is_valid
        self.oas_version = oas_version
        self.errors = errors or []
        self.warnings = warnings or []

    def add_error(self, error: ValidationError) -> None:
        """Add an error."""
        self.errors.append(error)
        self.is_valid = False

    def add_warning(self, warning: ValidationError) -> None:
        """Add a warning."""
        self.warnings.append(warning)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "is_valid": self.is_valid,
            "oas_version": self.oas_version,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings],
        }

    def __repr__(self) -> str:
        """String representation."""
        return f"ValidationResult(valid={self.is_valid}, errors={len(self.errors)}, warnings={len(self.warnings)})"


class OASValidator:
    """
    Validates OpenAPI Specification documents.

    Supports:
    - OAS 3.0.0, 3.0.x
    - OAS 3.1.0, 3.1.x
    - Required field validation
    - Reference ($ref) validation
    - Schema property validation
    """

    # Required fields at different levels
    REQUIRED_ROOT_FIELDS = {"openapi", "info", "paths"}
    REQUIRED_INFO_FIELDS = {"title", "version"}
    REQUIRED_OPERATION_FIELDS = {"responses"}

    # Schema types
    VALID_SCHEMA_TYPES = {
        "string",
        "number",
        "integer",
        "boolean",
        "array",
        "object",
        "null",
    }

    # Parameter locations
    VALID_PARAM_LOCATIONS = {"query", "header", "path", "cookie"}

    def __init__(self):
        """Initialize validator."""
        self.errors: List[ValidationError] = []
        self.warnings: List[ValidationError] = []
        self.oas_version: Optional[str] = None

    def validate(
        self,
        oas_content: str,
        content_format: str = "yaml",
    ) -> ValidationResult:
        """
        Validate OAS document.

        Args:
            oas_content: OAS document content (YAML or JSON)
            content_format: "yaml" or "json"

        Returns:
            ValidationResult with errors and warnings
        """
        self.errors = []
        self.warnings = []
        self.oas_version = None

        # Parse content
        try:
            oas_dict = self._parse_content(oas_content, content_format)
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                errors=[
                    ValidationError(
                        path="$",
                        message=f"Failed to parse {content_format}: {str(e)}",
                        error_type="parse_error",
                    )
                ],
            )

        # Detect OAS version
        self.oas_version = self._detect_version(oas_dict)

        # Validate structure
        self._validate_root_level(oas_dict)
        self._validate_info(oas_dict)
        self._validate_paths(oas_dict)
        self._validate_components(oas_dict)
        self._validate_references(oas_dict)

        is_valid = len(self.errors) == 0

        return ValidationResult(
            is_valid=is_valid,
            oas_version=self.oas_version,
            errors=self.errors,
            warnings=self.warnings,
        )

    def _parse_content(self, content: str, content_format: str) -> Dict[str, Any]:
        """Parse YAML or JSON content."""
        if content_format == "json":
            return json.loads(content)
        elif content_format == "yaml":
            return yaml.safe_load(content) or {}
        else:
            raise ValueError(f"Unsupported format: {content_format}")

    def _detect_version(self, oas_dict: Dict[str, Any]) -> str:
        """Detect OpenAPI version."""
        version_str = oas_dict.get("openapi", "unknown")
        if version_str.startswith("3.1"):
            return "3.1"
        elif version_str.startswith("3.0"):
            return "3.0"
        return "unknown"

    def _validate_root_level(self, oas_dict: Dict[str, Any]) -> None:
        """Validate root-level structure."""
        # Check required fields
        missing_fields = self.REQUIRED_ROOT_FIELDS - set(oas_dict.keys())
        for field in missing_fields:
            self.errors.append(
                ValidationError(
                    path="$",
                    message=f"Missing required field: {field}",
                    error_type="missing_field",
                )
            )

        # Validate openapi version format
        if "openapi" in oas_dict:
            version = oas_dict["openapi"]
            if not re.match(r"^3\.[01]\.\d+$", version):
                self.errors.append(
                    ValidationError(
                        path="$.openapi",
                        message=f"Invalid OpenAPI version: {version}. Must be 3.0.x or 3.1.x",
                        error_type="invalid_version",
                    )
                )

    def _validate_info(self, oas_dict: Dict[str, Any]) -> None:
        """Validate info object."""
        info = oas_dict.get("info")
        if not info:
            return

        if not isinstance(info, dict):
            self.errors.append(
                ValidationError(
                    path="$.info",
                    message="'info' must be an object",
                    error_type="invalid_type",
                )
            )
            return

        # Check required info fields
        missing_fields = self.REQUIRED_INFO_FIELDS - set(info.keys())
        for field in missing_fields:
            self.errors.append(
                ValidationError(
                    path=f"$.info.{field}",
                    message=f"Missing required field: {field}",
                    error_type="missing_field",
                )
            )

        # Validate title and version are strings
        if "title" in info and not isinstance(info["title"], str):
            self.errors.append(
                ValidationError(
                    path="$.info.title",
                    message="'title' must be a string",
                    error_type="invalid_type",
                )
            )

        if "version" in info and not isinstance(info["version"], str):
            self.errors.append(
                ValidationError(
                    path="$.info.version",
                    message="'version' must be a string",
                    error_type="invalid_type",
                )
            )

    def _validate_paths(self, oas_dict: Dict[str, Any]) -> None:
        """Validate paths object."""
        paths = oas_dict.get("paths")
        if not paths:
            return

        if not isinstance(paths, dict):
            self.errors.append(
                ValidationError(
                    path="$.paths",
                    message="'paths' must be an object",
                    error_type="invalid_type",
                )
            )
            return

        # Validate each path
        for path_key, path_item in paths.items():
            if isinstance(path_item, dict):
                self._validate_path_item(path_key, path_item)

    def _validate_path_item(self, path: str, path_item: Dict[str, Any]) -> None:
        """Validate a single path item."""
        # Valid HTTP methods
        http_methods = {
            "get",
            "put",
            "post",
            "delete",
            "options",
            "head",
            "patch",
            "trace",
        }

        for key, operation in path_item.items():
            if key.lower() in http_methods:
                if isinstance(operation, dict):
                    self._validate_operation(f"$.paths[{path}].{key}", operation)

    def _validate_operation(self, path: str, operation: Dict[str, Any]) -> None:
        """Validate operation object."""
        # Check required fields
        missing_fields = self.REQUIRED_OPERATION_FIELDS - set(operation.keys())
        for field in missing_fields:
            self.warnings.append(
                ValidationError(
                    path=f"{path}.{field}",
                    message=f"Operation missing recommended field: {field}",
                    error_type="missing_field",
                    severity="warning",
                )
            )

        # Validate parameters if present
        if "parameters" in operation:
            parameters = operation["parameters"]
            if isinstance(parameters, list):
                for i, param in enumerate(parameters):
                    if isinstance(param, dict):
                        self._validate_parameter(f"{path}.parameters[{i}]", param)

        # Validate responses
        if "responses" in operation:
            responses = operation["responses"]
            if isinstance(responses, dict):
                for status_code, response in responses.items():
                    if isinstance(response, dict):
                        self._validate_response(f"{path}.responses.{status_code}", response)

    def _validate_parameter(self, path: str, parameter: Dict[str, Any]) -> None:
        """Validate parameter object."""
        # Check required fields
        if "name" not in parameter:
            self.errors.append(
                ValidationError(
                    path=path,
                    message="Parameter missing required field: name",
                    error_type="missing_field",
                )
            )

        if "in" not in parameter:
            self.errors.append(
                ValidationError(
                    path=path,
                    message="Parameter missing required field: in",
                    error_type="missing_field",
                )
            )
        else:
            param_in = parameter["in"]
            if param_in not in self.VALID_PARAM_LOCATIONS:
                self.errors.append(
                    ValidationError(
                        path=f"{path}.in",
                        message=f"Invalid parameter location: {param_in}. Must be one of: {', '.join(self.VALID_PARAM_LOCATIONS)}",
                        error_type="invalid_value",
                    )
                )

    def _validate_response(self, path: str, response: Dict[str, Any]) -> None:
        """Validate response object."""
        # Check required description field (OAS 3.1 may have other requirements)
        if "description" not in response:
            self.warnings.append(
                ValidationError(
                    path=path,
                    message="Response missing recommended field: description",
                    error_type="missing_field",
                    severity="warning",
                )
            )

        # Validate content if present
        if "content" in response:
            content = response["content"]
            if isinstance(content, dict):
                for media_type, media_type_obj in content.items():
                    if isinstance(media_type_obj, dict) and "schema" in media_type_obj:
                        schema = media_type_obj["schema"]
                        if isinstance(schema, dict):
                            self._validate_schema(f"{path}.content.{media_type}.schema", schema)

    def _validate_components(self, oas_dict: Dict[str, Any]) -> None:
        """Validate components object."""
        components = oas_dict.get("components")
        if not components:
            return

        if not isinstance(components, dict):
            self.errors.append(
                ValidationError(
                    path="$.components",
                    message="'components' must be an object",
                    error_type="invalid_type",
                )
            )
            return

        # Validate schemas if present
        if "schemas" in components:
            schemas = components["schemas"]
            if isinstance(schemas, dict):
                for schema_name, schema in schemas.items():
                    if isinstance(schema, dict):
                        self._validate_schema(f"$.components.schemas.{schema_name}", schema)

    def _validate_schema(self, path: str, schema: Dict[str, Any]) -> None:
        """Validate schema object."""
        # Check type if present
        if "type" in schema:
            schema_type = schema["type"]
            if isinstance(schema_type, str):
                if schema_type not in self.VALID_SCHEMA_TYPES and schema_type != "file":
                    self.errors.append(
                        ValidationError(
                            path=f"{path}.type",
                            message=f"Invalid schema type: {schema_type}",
                            error_type="invalid_value",
                        )
                    )

        # Validate properties if present
        if "properties" in schema:
            properties = schema["properties"]
            if isinstance(properties, dict):
                for prop_name, prop_schema in properties.items():
                    if isinstance(prop_schema, dict):
                        self._validate_schema(f"{path}.properties.{prop_name}", prop_schema)

    def _validate_references(self, oas_dict: Dict[str, Any]) -> None:
        """Validate all $ref references."""
        self._validate_references_recursive(oas_dict, "$")

    def _validate_references_recursive(
        self,
        obj: Any,
        path: str,
    ) -> None:
        """Recursively validate references in object."""
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == "$ref":
                    self._validate_reference_value(path, value)
                else:
                    self._validate_references_recursive(
                        value,
                        f"{path}.{key}",
                    )
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                self._validate_references_recursive(item, f"{path}[{i}]")

    def _validate_reference_value(self, path: str, ref_value: Any) -> None:
        """Validate a $ref value."""
        if not isinstance(ref_value, str):
            self.errors.append(
                ValidationError(
                    path=path,
                    message="$ref must be a string",
                    error_type="invalid_type",
                )
            )
            return

        # Check format: should start with # or be external URL
        if not ref_value.startswith("#") and not ref_value.startswith("http"):
            self.errors.append(
                ValidationError(
                    path=path,
                    message=f"Invalid $ref format: {ref_value}. Must start with # (local) or http (external)",
                    error_type="invalid_format",
                )
            )


class FieldRequirementChecker:
    """Checks OAS field requirements based on version."""

    @staticmethod
    def get_required_fields(
        element_type: str,
        oas_version: str = "3.0",
    ) -> set:
        """
        Get required fields for an element type.

        Args:
            element_type: Type of element (info, path_item, operation, etc.)
            oas_version: OAS version ("3.0" or "3.1")

        Returns:
            Set of required field names
        """
        # OAS 3.0 requirements
        requirements_3_0 = {
            "root": {"openapi", "info", "paths"},
            "info": {"title", "version"},
            "path_item": set(),  # Path items don't have required fields
            "operation": {"responses"},
            "parameter": {"name", "in"},
            "response": {"description"},
            "schema": set(),  # Schemas don't have required fields
            "server": {"url"},
        }

        # OAS 3.1 is generally compatible with 3.0
        requirements_3_1 = requirements_3_0.copy()

        requirements = requirements_3_1 if oas_version == "3.1" else requirements_3_0

        return requirements.get(element_type, set())

    @staticmethod
    def check_element(
        element: Dict[str, Any],
        element_type: str,
        oas_version: str = "3.0",
    ) -> Tuple[List[str], List[str]]:
        """
        Check if element has required and optional fields.

        Args:
            element: Element to check
            element_type: Type of element
            oas_version: OAS version

        Returns:
            Tuple of (missing_required, present_optional)
        """
        required = FieldRequirementChecker.get_required_fields(element_type, oas_version)
        present_keys = set(element.keys()) if isinstance(element, dict) else set()

        missing_required = list(required - present_keys)
        present_optional = []

        # Optional fields vary by element type
        if element_type == "operation":
            optional_fields = {
                "summary",
                "description",
                "tags",
                "parameters",
                "requestBody",
                "security",
                "deprecated",
            }
            present_optional = list(optional_fields & present_keys)

        return missing_required, present_optional
