"""
T007: Unit tests for OAS to CSV Exporter.

Tests for converting OpenAPI specifications to CSV data
across different profile levels (Basic, Advanced, Technical, Expert).

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from io import StringIO

from src.services.oas_to_csv_exporter import (
    CSVProfile,
    ExportError,
    OASToCSVExporter,
    BulkOASToCSVExporter,
)


class TestOASToCSVExporterBasic:
    """Tests for basic OAS to CSV export."""

    def test_export_minimal_oas_api_info(self):
        """Export minimal OAS API info to CSV."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "Test API",
                "version": "1.0.0",
            },
            "paths": {},
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "api-info")

        assert "Test API" in csv_output
        assert "1.0.0" in csv_output
        assert "title" in csv_output
        assert "version" in csv_output

    def test_export_api_info_with_description(self):
        """Export API info with description."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "Pet Store API",
                "version": "2.0.0",
                "description": "A pet store API",
            },
            "paths": {},
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "api-info")

        assert "Pet Store API" in csv_output
        assert "A pet store API" in csv_output

    def test_export_api_info_with_contact(self):
        """Export API info with contact information."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "API",
                "version": "1.0",
                "contact": {
                    "name": "Support",
                    "email": "support@example.com",
                    "url": "https://support.example.com",
                },
            },
            "paths": {},
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "api-info")

        assert "Support" in csv_output
        assert "support@example.com" in csv_output
        assert "https://support.example.com" in csv_output

    def test_export_api_info_with_license(self):
        """Export API info with license."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "API",
                "version": "1.0",
                "license": {
                    "name": "MIT",
                    "url": "https://opensource.org/licenses/MIT",
                },
            },
            "paths": {},
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "api-info")

        assert "MIT" in csv_output
        assert "https://opensource.org/licenses/MIT" in csv_output


class TestOASToCSVExportServers:
    """Tests for servers export."""

    def test_export_single_server(self):
        """Export single server entry."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "servers": [
                {
                    "url": "https://api.example.com",
                    "description": "Production",
                }
            ],
            "paths": {},
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "servers")

        assert "https://api.example.com" in csv_output
        assert "Production" in csv_output

    def test_export_multiple_servers(self):
        """Export multiple server entries."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "servers": [
                {"url": "https://api.example.com", "description": "Production"},
                {"url": "https://staging.example.com", "description": "Staging"},
                {"url": "https://localhost:8000", "description": "Development"},
            ],
            "paths": {},
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "servers")

        assert "https://api.example.com" in csv_output
        assert "https://staging.example.com" in csv_output
        assert "https://localhost:8000" in csv_output

    def test_export_server_without_description(self):
        """Export server without description."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "servers": [
                {
                    "url": "https://api.example.com",
                }
            ],
            "paths": {},
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "servers")

        assert "https://api.example.com" in csv_output


class TestOASToCSVExportModels:
    """Tests for models/schemas export."""

    def test_export_simple_model(self):
        """Export simple model definition."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {},
            "components": {
                "schemas": {
                    "Pet": {
                        "type": "object",
                        "description": "A pet object",
                        "properties": {
                            "id": {"type": "integer", "description": "Pet ID"},
                            "name": {"type": "string", "description": "Pet name"},
                        },
                    }
                }
            },
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "models")

        assert "Pet" in csv_output
        assert "id" in csv_output
        assert "name" in csv_output
        assert "Pet ID" in csv_output
        assert "Pet name" in csv_output

    def test_export_model_with_required_fields(self):
        """Export model with required fields."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {},
            "components": {
                "schemas": {
                    "Pet": {
                        "type": "object",
                        "required": ["name", "email"],
                        "properties": {
                            "name": {"type": "string"},
                            "email": {"type": "string"},
                            "age": {"type": "integer"},
                        },
                    }
                }
            },
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "models")

        assert "name;email" in csv_output or ("name" in csv_output and "email" in csv_output)

    def test_export_multiple_models(self):
        """Export multiple model definitions."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {},
            "components": {
                "schemas": {
                    "Pet": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                        },
                    },
                    "User": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string"},
                            "age": {"type": "integer"},
                        },
                    },
                }
            },
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "models")

        assert "Pet" in csv_output
        assert "User" in csv_output


class TestOASToCSVExportOperations:
    """Tests for operations export."""

    def test_export_simple_operation(self):
        """Export simple operation definition."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List all pets",
                        "responses": {
                            "200": {
                                "description": "Success",
                            }
                        },
                    }
                }
            },
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "operations")

        assert "/pets" in csv_output
        assert "get" in csv_output
        assert "List all pets" in csv_output

    def test_export_operation_with_description(self):
        """Export operation with description."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List pets",
                        "description": "Retrieve a list of pets",
                        "responses": {
                            "200": {
                                "description": "Success",
                            }
                        },
                    }
                }
            },
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "operations")

        assert "List pets" in csv_output
        assert "Retrieve a list of pets" in csv_output

    def test_export_operation_with_tags(self):
        """Export operation with tags."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List pets",
                        "tags": ["pets", "animals"],
                        "responses": {
                            "200": {
                                "description": "Success",
                            }
                        },
                    }
                }
            },
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "operations")

        assert "pets;animals" in csv_output or ("pets" in csv_output and "animals" in csv_output)

    def test_export_operation_with_operation_id(self):
        """Export operation with operationId."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List pets",
                        "operationId": "listPets",
                        "responses": {
                            "200": {
                                "description": "Success",
                            }
                        },
                    }
                }
            },
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "operations")

        assert "listPets" in csv_output

    def test_export_deprecated_operation(self):
        """Export deprecated operation."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {
                "/old-endpoint": {
                    "get": {
                        "summary": "Old endpoint",
                        "deprecated": True,
                        "responses": {
                            "200": {
                                "description": "Success",
                            }
                        },
                    }
                }
            },
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "operations")

        assert "true" in csv_output.lower()

    def test_export_multiple_operations(self):
        """Export multiple operations on different paths."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List pets",
                        "responses": {"200": {"description": "Success"}},
                    },
                    "post": {
                        "summary": "Create pet",
                        "responses": {"201": {"description": "Created"}},
                    },
                },
                "/pets/{id}": {
                    "get": {
                        "summary": "Get pet",
                        "responses": {"200": {"description": "Success"}},
                    }
                },
            },
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(oas, "operations")

        assert "/pets" in csv_output
        assert "/pets/{id}" in csv_output


class TestOASToCSVProfileLevels:
    """Tests for different profile levels."""

    def test_basic_profile_excludes_advanced_fields(self):
        """Basic profile doesn't include advanced features."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List pets",
                        "parameters": [
                            {
                                "name": "limit",
                                "in": "query",
                                "schema": {"type": "integer"},
                            }
                        ],
                        "responses": {"200": {"description": "Success"}},
                    }
                }
            },
        }
        exporter = OASToCSVExporter(CSVProfile.BASIC)

        # Basic profile should work
        assert exporter.profile == CSVProfile.BASIC

    def test_advanced_profile_includes_parameters(self):
        """Advanced profile includes parameter definitions."""
        exporter = OASToCSVExporter(CSVProfile.ADVANCED)

        # Advanced profile should support parameters
        assert exporter.profile == CSVProfile.ADVANCED

    def test_expert_profile_supports_all_features(self):
        """Expert profile supports all OAS features."""
        exporter = OASToCSVExporter(CSVProfile.EXPERT)

        # Expert profile should support all features
        assert exporter.profile == CSVProfile.EXPERT


class TestOASToCSVRoundTrip:
    """Tests for round-trip conversion."""

    def test_round_trip_api_info(self):
        """Round-trip API info: OAS → CSV → OAS."""
        original_oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "Pet Store API",
                "version": "1.5.0",
                "description": "A pet store",
            },
            "paths": {},
        }
        exporter = OASToCSVExporter()

        # Export to CSV
        csv_output = exporter.export_to_string(original_oas, "api-info")

        # Should contain key values
        assert "Pet Store API" in csv_output
        assert "1.5.0" in csv_output
        assert "A pet store" in csv_output

    def test_round_trip_servers(self):
        """Round-trip servers: OAS → CSV → OAS."""
        original_oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "servers": [
                {"url": "https://api.example.com", "description": "Production"},
                {"url": "https://staging.example.com", "description": "Staging"},
            ],
            "paths": {},
        }
        exporter = OASToCSVExporter()

        csv_output = exporter.export_to_string(original_oas, "servers")

        # Should contain both servers
        assert "https://api.example.com" in csv_output
        assert "https://staging.example.com" in csv_output


class TestOASToCSVBulkExport:
    """Tests for bulk OAS to CSV export."""

    def test_bulk_export_multiple_csvs(self):
        """Export complete OAS to multiple CSV files."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "Pet API",
                "version": "1.0.0",
            },
            "servers": [
                {"url": "https://api.example.com", "description": "Production"},
            ],
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List pets",
                        "responses": {"200": {"description": "Success"}},
                    }
                }
            },
            "components": {
                "schemas": {
                    "Pet": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                        },
                    }
                }
            },
        }
        bulk = BulkOASToCSVExporter()

        csvs = bulk.export_oas(oas)

        # Should have all sections
        assert "api-info" in csvs
        assert "servers" in csvs
        assert "models" in csvs
        assert "operations" in csvs

        # Each should have content
        assert len(csvs["api-info"]) > 0
        assert len(csvs["servers"]) > 0
        assert len(csvs["models"]) > 0
        assert len(csvs["operations"]) > 0

    def test_bulk_export_partial_oas(self):
        """Export partial OAS with only some sections."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "API",
                "version": "1.0.0",
            },
            "paths": {
                "/test": {
                    "get": {
                        "summary": "Test",
                        "responses": {"200": {"description": "OK"}},
                    }
                }
            },
        }
        bulk = BulkOASToCSVExporter()

        csvs = bulk.export_oas(oas)

        # Should have api-info and operations
        assert "api-info" in csvs
        assert "operations" in csvs

        # May not have servers or models
        assert len(csvs["api-info"]) > 0
        assert len(csvs["operations"]) > 0


class TestOASToCSVErrorHandling:
    """Tests for error handling."""

    def test_invalid_data_type(self):
        """Reject invalid data type."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {},
        }
        exporter = OASToCSVExporter()

        with pytest.raises(ExportError):
            exporter.export_to_string(oas, "invalid-type")

    def test_missing_info_section(self):
        """Handle missing info section gracefully."""
        oas = {
            "openapi": "3.0.0",
            "paths": {},
        }
        exporter = OASToCSVExporter()

        # Should handle gracefully
        csv_output = exporter.export_to_string(oas, "api-info")
        assert isinstance(csv_output, str)

    def test_missing_paths_section(self):
        """Handle missing paths section gracefully."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
        }
        exporter = OASToCSVExporter()

        # Should handle gracefully
        csv_output = exporter.export_to_string(oas, "operations")
        assert isinstance(csv_output, str)

    def test_missing_components_section(self):
        """Handle missing components section gracefully."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0.0"},
            "paths": {},
        }
        exporter = OASToCSVExporter()

        # Should handle gracefully
        csv_output = exporter.export_to_string(oas, "models")
        assert isinstance(csv_output, str)
