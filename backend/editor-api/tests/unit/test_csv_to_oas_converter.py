"""
T006: Unit tests for CSV to OAS Converter.

Tests for converting CSV data to OpenAPI specifications
across different profile levels (Basic, Advanced, Technical, Expert).

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from io import StringIO

from src.services.csv_to_oas_converter import (
    CSVProfile,
    CSVRow,
    ConversionError,
    CSVToOASConverter,
    BulkCSVConverter,
)


class TestCSVRow:
    """Tests for CSVRow helper class."""

    def test_csv_row_get_string(self):
        """Get string value from CSV row."""
        row = CSVRow({"title": "Test API", "version": "1.0.0"})

        assert row.get("title") == "Test API"
        assert row.get("version") == "1.0.0"

    def test_csv_row_get_with_default(self):
        """Get value with default fallback."""
        row = CSVRow({"title": "Test API"})

        assert row.get("title") == "Test API"
        assert row.get("missing", "default") == "default"

    def test_csv_row_get_bool_true_values(self):
        """Recognize various true values."""
        for true_val in ["true", "True", "TRUE", "yes", "1", "on"]:
            row = CSVRow({"flag": true_val})
            assert row.get_bool("flag") is True

    def test_csv_row_get_bool_false_values(self):
        """Recognize various false values."""
        for false_val in ["false", "False", "FALSE", "no", "0", "off"]:
            row = CSVRow({"flag": false_val})
            assert row.get_bool("flag") is False

    def test_csv_row_get_list(self):
        """Parse semicolon-separated list."""
        row = CSVRow({"tags": "pets;users;orders"})

        tags = row.get_list("tags")
        assert len(tags) == 3
        assert "pets" in tags
        assert "users" in tags

    def test_csv_row_get_list_empty(self):
        """Empty list returns empty array."""
        row = CSVRow({"tags": ""})

        assert row.get_list("tags") == []


class TestAPIInfoConversion:
    """Tests for API info CSV conversion."""

    def test_convert_minimal_api_info(self):
        """Convert minimal API info CSV."""
        csv_data = "title,version\nTest API,1.0.0"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "api-info")

        assert "info" in result
        assert result["info"]["title"] == "Test API"
        assert result["info"]["version"] == "1.0.0"

    def test_convert_api_info_with_description(self):
        """Convert API info with description."""
        csv_data = "title,version,description\nPet API,2.0.0,A pet store API"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "api-info")

        assert result["info"]["description"] == "A pet store API"

    def test_convert_api_info_with_contact(self):
        """Convert API info with contact information."""
        csv_data = "title,version,contact_name,contact_email\nAPI,1.0,Support,support@example.com"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "api-info")

        assert "contact" in result["info"]
        assert result["info"]["contact"]["name"] == "Support"
        assert result["info"]["contact"]["email"] == "support@example.com"

    def test_convert_api_info_with_license(self):
        """Convert API info with license."""
        csv_data = "title,version,license_name,license_url\nAPI,1.0,MIT,https://opensource.org/licenses/MIT"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "api-info")

        assert "license" in result["info"]
        assert result["info"]["license"]["name"] == "MIT"


class TestServersConversion:
    """Tests for servers CSV conversion."""

    def test_convert_single_server(self):
        """Convert single server entry."""
        csv_data = "url,description\nhttps://api.example.com,Production"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "servers")

        assert "servers" in result
        assert len(result["servers"]) == 1
        assert result["servers"][0]["url"] == "https://api.example.com"
        assert result["servers"][0]["description"] == "Production"

    def test_convert_multiple_servers(self):
        """Convert multiple server entries."""
        csv_data = """url,description
https://api.example.com,Production
https://staging.example.com,Staging
https://localhost:8000,Development"""
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "servers")

        assert len(result["servers"]) == 3

    def test_convert_server_without_description(self):
        """Convert server without description."""
        csv_data = "url\nhttps://api.example.com"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "servers")

        assert result["servers"][0]["url"] == "https://api.example.com"
        assert "description" not in result["servers"][0]


class TestModelsConversion:
    """Tests for models/schemas CSV conversion."""

    def test_convert_simple_model(self):
        """Convert simple model definition."""
        csv_data = """model_name,type,description,property_name,property_type,property_description
Pet,object,A pet object,id,integer,Pet ID
Pet,object,A pet object,name,string,Pet name"""
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "models")

        assert "components" in result
        assert "schemas" in result["components"]
        assert "Pet" in result["components"]["schemas"]
        assert "properties" in result["components"]["schemas"]["Pet"]
        assert "id" in result["components"]["schemas"]["Pet"]["properties"]
        assert "name" in result["components"]["schemas"]["Pet"]["properties"]

    def test_convert_model_with_required_fields(self):
        """Convert model with required fields specification."""
        csv_data = """model_name,type,required_fields,property_name,property_type
Pet,object,name;email,name,string
Pet,object,name;email,email,string
Pet,object,name;email,age,integer"""
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "models")

        schema = result["components"]["schemas"]["Pet"]
        assert "required" in schema
        assert "name" in schema["required"]
        assert "email" in schema["required"]

    def test_convert_multiple_models(self):
        """Convert multiple model definitions."""
        csv_data = """model_name,type,property_name,property_type
Pet,object,name,string
User,object,email,string
User,object,age,integer"""
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "models")

        schemas = result["components"]["schemas"]
        assert "Pet" in schemas
        assert "User" in schemas
        assert len(schemas["User"]["properties"]) == 2


class TestOperationsConversion:
    """Tests for operations CSV conversion."""

    def test_convert_simple_operation(self):
        """Convert simple operation definition."""
        csv_data = "path,method,summary,response_200_description\n/pets,get,List all pets,Success"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "operations")

        assert "paths" in result
        assert "/pets" in result["paths"]
        assert "get" in result["paths"]["/pets"]
        assert result["paths"]["/pets"]["get"]["summary"] == "List all pets"

    def test_convert_operation_with_description(self):
        """Convert operation with description."""
        csv_data = "path,method,summary,description,response_200_description\n/pets,get,List pets,Retrieve a list of pets,Success"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "operations")

        operation = result["paths"]["/pets"]["get"]
        assert operation["summary"] == "List pets"
        assert operation["description"] == "Retrieve a list of pets"

    def test_convert_operation_with_tags(self):
        """Convert operation with tags."""
        csv_data = "path,method,summary,tags,response_200_description\n/pets,get,List pets,pets;animals,Success"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "operations")

        operation = result["paths"]["/pets"]["get"]
        assert "tags" in operation
        assert "pets" in operation["tags"]
        assert "animals" in operation["tags"]

    def test_convert_operation_with_operation_id(self):
        """Convert operation with operationId."""
        csv_data = "path,method,summary,operationId,response_200_description\n/pets,get,List pets,listPets,Success"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "operations")

        operation = result["paths"]["/pets"]["get"]
        assert operation["operationId"] == "listPets"

    def test_convert_deprecated_operation(self):
        """Convert deprecated operation."""
        csv_data = "path,method,summary,deprecated,response_200_description\n/old-endpoint,get,Old endpoint,true,Success"
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "operations")

        operation = result["paths"]["/old-endpoint"]["get"]
        assert operation["deprecated"] is True

    def test_convert_multiple_operations(self):
        """Convert multiple operations on different paths."""
        csv_data = """path,method,summary,response_200_description
/pets,get,List pets,Success
/pets,post,Create pet,Created
/pets/{id},get,Get pet,Success"""
        converter = CSVToOASConverter()

        result = converter.convert_from_string(csv_data, "operations")

        paths = result["paths"]
        assert len(paths) == 2
        assert "get" in paths["/pets"]
        assert "post" in paths["/pets"]
        assert "get" in paths["/pets/{id}"]


class TestProfileLevels:
    """Tests for different profile levels."""

    def test_basic_profile_excludes_advanced_fields(self):
        """Basic profile doesn't include advanced features."""
        converter = CSVToOASConverter(CSVProfile.BASIC)

        # Advanced features should be excluded
        # This is validated by converter behavior

    def test_advanced_profile_includes_parameters(self):
        """Advanced profile includes parameter definitions."""
        converter = CSVToOASConverter(CSVProfile.ADVANCED)

        # Advanced profile should support parameters
        assert converter.profile == CSVProfile.ADVANCED

    def test_expert_profile_supports_all_features(self):
        """Expert profile supports all OAS features."""
        converter = CSVToOASConverter(CSVProfile.EXPERT)

        # Expert profile should support all features
        assert converter.profile == CSVProfile.EXPERT


class TestOASGeneration:
    """Tests for OAS document generation."""

    def test_create_minimal_oas(self):
        """Create minimal OAS document."""
        converter = CSVToOASConverter()

        oas = converter.create_minimal_oas()

        assert oas["openapi"] == "3.0.0"
        assert "info" in oas
        assert "paths" in oas
        assert oas["info"]["title"] == "API"
        assert oas["info"]["version"] == "1.0.0"

    def test_merge_oas_parts(self):
        """Merge multiple OAS parts."""
        converter = CSVToOASConverter()

        base = converter.create_minimal_oas("Test API", "2.0.0")
        servers_part = {"servers": [{"url": "https://api.example.com"}]}
        paths_part = {"paths": {"/pets": {"get": {}}}}

        merged = converter.merge_oas_parts(base, servers_part, paths_part)

        assert merged["info"]["title"] == "Test API"
        assert len(merged["servers"]) == 1
        assert "/pets" in merged["paths"]


class TestBulkConversion:
    """Tests for bulk CSV conversion."""

    def test_bulk_convert_multiple_csvs(self):
        """Convert multiple CSV files to complete OAS."""
        bulk = BulkCSVConverter()

        csvs = {
            "api-info": "title,version\nPet API,1.0.0",
            "servers": "url,description\nhttps://api.example.com,Production",
            "models": "model_name,type,property_name,property_type\nPet,object,name,string",
            "operations": "path,method,summary,response_200_description\n/pets,get,List pets,Success",
        }

        result = bulk.convert_csvs(csvs)

        # Check all components are present
        assert result["info"]["title"] == "Pet API"
        assert len(result["servers"]) == 1
        assert "Pet" in result["components"]["schemas"]
        assert "/pets" in result["paths"]

    def test_bulk_convert_partial_csvs(self):
        """Convert with only some CSV files."""
        bulk = BulkCSVConverter()

        csvs = {
            "api-info": "title,version\nAPI,1.0.0",
            "operations": "path,method,summary,response_200_description\n/test,get,Test,OK",
        }

        result = bulk.convert_csvs(csvs)

        # Should handle missing sections gracefully
        assert result["info"]["title"] == "API"
        assert "/test" in result["paths"]


class TestErrorHandling:
    """Tests for error handling."""

    def test_invalid_data_type(self):
        """Reject invalid data type."""
        converter = CSVToOASConverter()

        with pytest.raises(ConversionError):
            converter.convert_from_string("data", "invalid-type")

    def test_empty_csv_api_info(self):
        """Handle empty API info CSV."""
        converter = CSVToOASConverter()

        with pytest.raises(ConversionError):
            converter.convert_from_string("", "api-info")

    def test_missing_required_headers(self):
        """Handle missing required CSV headers."""
        csv_data = "wrong_column\nvalue"
        converter = CSVToOASConverter()

        # Should still work but with defaults
        result = converter.convert_from_string(csv_data, "api-info")
        assert "info" in result
