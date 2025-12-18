"""
T011: Unit tests for OpenAPI Generator.

Tests for Feature 003 - OpenAPI Export.
TDD: Tests written BEFORE implementation.

Tests OpenAPI spec generation from parsed DSL:
- Service -> info + servers
- Model -> components/schemas
- Operation -> paths
- Error -> components/responses
"""

import pytest


class TestOpenAPIGeneratorInfo:
    """Tests for OpenAPI info section generation."""

    def test_generates_info_from_service(self):
        """Test that service metadata becomes OpenAPI info section."""
        from src.utils.openapi_generator import OpenAPIGenerator

        # Minimal parsed service
        parsed = {
            "services": [{
                "name": "Petstore API",
                "title": "Petstore API",
                "version": "1.0.0",
                "description": "A sample pet store API.",
                "base_path": "/api/v1"
            }],
            "models": [],
            "operations": [],
            "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        assert "info" in spec
        assert spec["info"]["title"] == "Petstore API"
        assert spec["info"]["version"] == "1.0.0"
        assert "pet store" in spec["info"]["description"].lower()

    def test_info_has_openapi_version(self):
        """Test that OpenAPI version is included."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [], "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        assert "openapi" in spec
        assert spec["openapi"].startswith("3.0")


class TestOpenAPIGeneratorServers:
    """Tests for OpenAPI servers section generation."""

    def test_generates_servers_from_base_path(self):
        """Test that base_path becomes a server entry."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{
                "name": "Test API",
                "version": "1.0.0",
                "base_path": "/api/v1"
            }],
            "models": [], "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        assert "servers" in spec
        assert len(spec["servers"]) >= 1
        assert spec["servers"][0]["url"] == "/api/v1"


class TestOpenAPIGeneratorSchemas:
    """Tests for components/schemas generation from models."""

    def test_generates_schema_from_model(self):
        """Test that model becomes a schema in components."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [{
                "name": "Pet",
                "description": "A pet in the store.",
                "fields": [
                    {"name": "id", "type": "integer", "required": True, "description": "Pet ID"},
                    {"name": "name", "type": "string", "required": True, "description": "Pet name"}
                ]
            }],
            "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        assert "components" in spec
        assert "schemas" in spec["components"]
        assert "Pet" in spec["components"]["schemas"]

        pet_schema = spec["components"]["schemas"]["Pet"]
        assert pet_schema["type"] == "object"
        assert "properties" in pet_schema

    def test_schema_properties_have_types(self):
        """Test that schema properties include types."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [{
                "name": "Pet",
                "fields": [
                    {"name": "id", "type": "integer", "required": True},
                    {"name": "name", "type": "string", "required": True}
                ]
            }],
            "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        properties = spec["components"]["schemas"]["Pet"]["properties"]
        assert properties["id"]["type"] == "integer"
        assert properties["name"]["type"] == "string"

    def test_schema_required_fields_array(self):
        """Test that required fields are listed in required array."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [{
                "name": "Pet",
                "fields": [
                    {"name": "id", "type": "integer", "required": True},
                    {"name": "name", "type": "string", "required": True},
                    {"name": "tag", "type": "string", "required": False}
                ]
            }],
            "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        required = spec["components"]["schemas"]["Pet"].get("required", [])
        assert "id" in required
        assert "name" in required
        assert "tag" not in required

    def test_schema_properties_have_examples(self):
        """Test that schema properties include example values."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [{
                "name": "User",
                "fields": [
                    {"name": "id", "type": "integer", "required": True},
                    {"name": "email", "type": "string", "required": True}
                ]
            }],
            "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        properties = spec["components"]["schemas"]["User"]["properties"]
        assert "example" in properties["id"]
        assert "example" in properties["email"]
        # Email example should contain @
        assert "@" in properties["email"]["example"]

    def test_schema_handles_model_reference(self):
        """Test that model references become $ref."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [{
                "name": "Pet",
                "fields": [
                    {"name": "id", "type": "integer", "required": True},
                    {"name": "category", "type": "Category", "required": False}
                ]
            }],
            "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        category_prop = spec["components"]["schemas"]["Pet"]["properties"]["category"]
        assert "$ref" in category_prop
        assert "#/components/schemas/Category" in category_prop["$ref"]

    def test_schema_handles_array_type(self):
        """Test that array types are properly converted."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [{
                "name": "Pet",
                "fields": [
                    {"name": "tags", "type": "string[]", "required": False}
                ]
            }],
            "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        tags_prop = spec["components"]["schemas"]["Pet"]["properties"]["tags"]
        assert tags_prop["type"] == "array"
        assert "items" in tags_prop
        assert tags_prop["items"]["type"] == "string"


class TestOpenAPIGeneratorPaths:
    """Tests for paths generation from operations."""

    def test_generates_path_from_operation(self):
        """Test that operation becomes a path entry."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [],
            "operations": [{
                "method": "GET",
                "path": "/pets",
                "summary": "List all pets",
                "description": None,
                "response_model": "Pet"
            }],
            "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        assert "paths" in spec
        assert "/pets" in spec["paths"]
        assert "get" in spec["paths"]["/pets"]

    def test_path_includes_summary(self):
        """Test that operation summary is included."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [],
            "operations": [{
                "method": "GET",
                "path": "/pets",
                "summary": "List all pets",
                "description": None,
                "response_model": "Pet"
            }],
            "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        get_op = spec["paths"]["/pets"]["get"]
        assert get_op["summary"] == "List all pets"

    def test_path_includes_response(self):
        """Test that operation response is included."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [],
            "operations": [{
                "method": "GET",
                "path": "/pets/{petId}",
                "summary": "Get pet by ID",
                "response_model": "Pet"
            }],
            "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        get_op = spec["paths"]["/pets/{petId}"]["get"]
        assert "responses" in get_op
        assert "200" in get_op["responses"]

    def test_path_response_references_schema(self):
        """Test that response body references model schema."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [{"name": "Pet", "fields": []}],
            "operations": [{
                "method": "GET",
                "path": "/pets/{petId}",
                "summary": "Get pet",
                "response_model": "Pet"
            }],
            "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        response_content = spec["paths"]["/pets/{petId}"]["get"]["responses"]["200"]["content"]
        schema = response_content["application/json"]["schema"]
        assert "$ref" in schema
        assert "#/components/schemas/Pet" in schema["$ref"]

    def test_path_includes_request_body(self):
        """Test that POST/PUT operations include requestBody."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [],
            "operations": [{
                "method": "POST",
                "path": "/pets",
                "summary": "Create pet",
                "request_model": "Pet",
                "response_model": "Pet"
            }],
            "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        post_op = spec["paths"]["/pets"]["post"]
        assert "requestBody" in post_op
        assert post_op["requestBody"]["required"] is True

    def test_path_includes_path_parameters(self):
        """Test that path parameters are extracted and included."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [],
            "operations": [{
                "method": "GET",
                "path": "/pets/{petId}",
                "summary": "Get pet",
                "response_model": "Pet"
            }],
            "errors": []
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        get_op = spec["paths"]["/pets/{petId}"]["get"]
        assert "parameters" in get_op
        param_names = [p["name"] for p in get_op["parameters"]]
        assert "petId" in param_names

        petId_param = next(p for p in get_op["parameters"] if p["name"] == "petId")
        assert petId_param["in"] == "path"
        assert petId_param["required"] is True


class TestOpenAPIGeneratorResponses:
    """Tests for components/responses generation from errors."""

    def test_generates_response_from_error(self):
        """Test that error becomes a response component."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [],
            "operations": [],
            "errors": [{
                "status_code": 404,
                "name": "NotFound",
                "description": "The requested resource was not found."
            }]
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        assert "components" in spec
        assert "responses" in spec["components"]
        assert "NotFound" in spec["components"]["responses"]

    def test_response_includes_description(self):
        """Test that error description is included."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [], "operations": [],
            "errors": [{
                "status_code": 400,
                "name": "BadRequest",
                "description": "The request was invalid."
            }]
        }

        generator = OpenAPIGenerator()
        spec = generator.generate(parsed)

        response = spec["components"]["responses"]["BadRequest"]
        assert "invalid" in response["description"].lower()


class TestOpenAPIGeneratorYAMLOutput:
    """Tests for YAML output format."""

    def test_to_yaml_produces_valid_yaml(self):
        """Test that to_yaml produces valid YAML string."""
        from src.utils.openapi_generator import OpenAPIGenerator
        import yaml

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [], "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        yaml_str = generator.to_yaml(parsed)

        # Should be parseable as YAML
        parsed_yaml = yaml.safe_load(yaml_str)
        assert parsed_yaml["openapi"].startswith("3.0")


class TestOpenAPIGeneratorJSONOutput:
    """Tests for JSON output format."""

    def test_to_json_produces_valid_json(self):
        """Test that to_json produces valid JSON string."""
        from src.utils.openapi_generator import OpenAPIGenerator
        import json

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [], "operations": [], "errors": []
        }

        generator = OpenAPIGenerator()
        json_str = generator.to_json(parsed)

        # Should be parseable as JSON
        parsed_json = json.loads(json_str)
        assert parsed_json["openapi"].startswith("3.0")


class TestOpenAPIGenerator31Support:
    """Tests for OpenAPI 3.1 specific features."""

    def test_generates_openapi_31_version(self):
        """Test that 3.1 version can be specified."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [], "operations": [], "errors": []
        }

        generator = OpenAPIGenerator(version="3.1.0")
        spec = generator.generate(parsed)

        assert spec["openapi"] == "3.1.0"

    def test_31_uses_examples_array_for_properties(self):
        """Test that 3.1 uses 'examples' array instead of 'example'."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [{
                "name": "User",
                "fields": [
                    {"name": "id", "type": "integer", "required": True},
                    {"name": "email", "type": "string", "required": True}
                ]
            }],
            "operations": [], "errors": []
        }

        generator = OpenAPIGenerator(version="3.1.0")
        spec = generator.generate(parsed)

        properties = spec["components"]["schemas"]["User"]["properties"]

        # In 3.1, should use 'examples' array instead of 'example'
        assert "examples" in properties["id"]
        assert isinstance(properties["id"]["examples"], list)
        assert "example" not in properties["id"]

    def test_30_uses_example_singular(self):
        """Test that 3.0 uses 'example' singular."""
        from src.utils.openapi_generator import OpenAPIGenerator

        parsed = {
            "services": [{"name": "Test", "version": "1.0.0", "base_path": "/api"}],
            "models": [{
                "name": "User",
                "fields": [
                    {"name": "id", "type": "integer", "required": True}
                ]
            }],
            "operations": [], "errors": []
        }

        generator = OpenAPIGenerator(version="3.0.3")
        spec = generator.generate(parsed)

        properties = spec["components"]["schemas"]["User"]["properties"]

        # In 3.0, should use 'example' singular
        assert "example" in properties["id"]
        assert "examples" not in properties["id"]
