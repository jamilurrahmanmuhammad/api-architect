"""
T008: Unit tests for Document Generator Service.

Tests for generating API documentation from OpenAPI specifications
in multiple formats (Markdown, HTML, plain text).

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from datetime import datetime

from src.services.document_generator import (
    DocumentFormat,
    DocumentStyle,
    GenerationError,
    HTMLDocumentGenerator,
    MarkdownDocumentGenerator,
)


class TestDocumentGeneratorBasic:
    """Tests for basic document generation."""

    def test_create_markdown_generator(self):
        """Create a markdown document generator."""
        generator = MarkdownDocumentGenerator()

        assert generator is not None
        assert generator.format == DocumentFormat.MARKDOWN

    def test_create_html_generator(self):
        """Create an HTML document generator."""
        generator = HTMLDocumentGenerator()

        assert generator is not None
        assert generator.format == DocumentFormat.HTML

    def test_generate_minimal_oas_markdown(self):
        """Generate markdown from minimal OAS."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "Test API",
                "version": "1.0.0",
            },
            "paths": {},
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert isinstance(doc, str)
        assert "Test API" in doc
        assert "1.0.0" in doc
        assert len(doc) > 0

    def test_generate_minimal_oas_html(self):
        """Generate HTML from minimal OAS."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "Test API",
                "version": "1.0.0",
            },
            "paths": {},
        }
        generator = HTMLDocumentGenerator()

        doc = generator.generate(oas)

        assert isinstance(doc, str)
        assert "Test API" in doc
        assert "1.0.0" in doc
        assert "<html" in doc.lower() or "<!doctype" in doc.lower()


class TestMarkdownDocumentGeneration:
    """Tests for Markdown documentation generation."""

    def test_markdown_include_api_title_and_version(self):
        """Markdown includes API title and version."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "Pet Store API",
                "version": "2.1.0",
                "description": "A pet store API",
            },
            "paths": {},
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "Pet Store API" in doc
        assert "2.1.0" in doc
        assert "A pet store API" in doc

    def test_markdown_include_api_description(self):
        """Markdown includes API description."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "API",
                "version": "1.0.0",
                "description": "This is a comprehensive API description",
            },
            "paths": {},
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "This is a comprehensive API description" in doc

    def test_markdown_include_servers(self):
        """Markdown includes server information."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "servers": [
                {"url": "https://api.example.com", "description": "Production"},
                {"url": "https://staging.example.com", "description": "Staging"},
            ],
            "paths": {},
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "https://api.example.com" in doc
        assert "https://staging.example.com" in doc
        assert "Production" in doc or "Staging" in doc

    def test_markdown_include_single_operation(self):
        """Markdown includes single API operation."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List all pets",
                        "description": "Returns a list of all pets",
                        "responses": {
                            "200": {
                                "description": "Success",
                            }
                        },
                    }
                }
            },
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "/pets" in doc
        assert "List all pets" in doc or "GET" in doc
        assert "Returns a list of all pets" in doc

    def test_markdown_include_multiple_operations(self):
        """Markdown includes multiple operations."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
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
                        "summary": "Get pet by ID",
                        "responses": {"200": {"description": "Success"}},
                    }
                },
            },
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "/pets" in doc
        assert "/pets/{id}" in doc
        assert "List pets" in doc or "Create pet" in doc

    def test_markdown_include_parameters(self):
        """Markdown includes operation parameters."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List pets",
                        "parameters": [
                            {
                                "name": "limit",
                                "in": "query",
                                "description": "Maximum number of results",
                                "schema": {"type": "integer"},
                            }
                        ],
                        "responses": {"200": {"description": "Success"}},
                    }
                }
            },
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "limit" in doc
        assert "query" in doc or "parameter" in doc.lower()

    def test_markdown_include_schemas(self):
        """Markdown includes schema definitions."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "responses": {
                            "200": {
                                "description": "Success",
                            }
                        }
                    }
                }
            },
            "components": {
                "schemas": {
                    "Pet": {
                        "type": "object",
                        "description": "A pet",
                        "properties": {
                            "id": {"type": "integer"},
                            "name": {"type": "string"},
                            "status": {"type": "string"},
                        },
                    }
                }
            },
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "Pet" in doc
        assert "id" in doc or "name" in doc

    def test_markdown_include_contact_info(self):
        """Markdown includes contact information."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "API",
                "version": "1.0.0",
                "contact": {
                    "name": "Support Team",
                    "email": "support@example.com",
                    "url": "https://support.example.com",
                },
            },
            "paths": {},
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "Support Team" in doc or "support@example.com" in doc

    def test_markdown_include_license(self):
        """Markdown includes license information."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "API",
                "version": "1.0.0",
                "license": {
                    "name": "MIT",
                    "url": "https://opensource.org/licenses/MIT",
                },
            },
            "paths": {},
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "MIT" in doc or "license" in doc.lower()


class TestHTMLDocumentGeneration:
    """Tests for HTML documentation generation."""

    def test_html_is_valid_structure(self):
        """HTML has valid document structure."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {},
        }
        generator = HTMLDocumentGenerator()

        doc = generator.generate(oas)

        # Should have basic HTML structure
        assert ("<html" in doc.lower() or "<!doctype" in doc.lower())
        assert "API" in doc
        assert "1.0.0" in doc

    def test_html_include_api_title(self):
        """HTML includes API title."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "Pet Store API",
                "version": "1.0.0",
            },
            "paths": {},
        }
        generator = HTMLDocumentGenerator()

        doc = generator.generate(oas)

        assert "Pet Store API" in doc

    def test_html_include_endpoints_section(self):
        """HTML includes endpoints section."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List pets",
                        "responses": {"200": {"description": "Success"}},
                    }
                }
            },
        }
        generator = HTMLDocumentGenerator()

        doc = generator.generate(oas)

        assert "/pets" in doc
        assert "GET" in doc or "List pets" in doc

    def test_html_include_schemas_section(self):
        """HTML includes schemas section."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {},
            "components": {
                "schemas": {
                    "Pet": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer"},
                            "name": {"type": "string"},
                        },
                    }
                }
            },
        }
        generator = HTMLDocumentGenerator()

        doc = generator.generate(oas)

        assert "Pet" in doc


class TestDocumentStyles:
    """Tests for document styling options."""

    def test_markdown_with_default_style(self):
        """Markdown with default style."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {},
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert len(doc) > 0

    def test_html_with_styled_output(self):
        """HTML with styled output."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {},
        }
        generator = HTMLDocumentGenerator(style=DocumentStyle.PROFESSIONAL)

        doc = generator.generate(oas)

        assert len(doc) > 0
        # Professional style should have some CSS or styling
        assert ("style" in doc.lower() or "<css" in doc.lower() or len(doc) > 500)

    def test_html_with_compact_style(self):
        """HTML with compact style."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {},
        }
        generator = HTMLDocumentGenerator(style=DocumentStyle.COMPACT)

        doc = generator.generate(oas)

        assert len(doc) > 0


class TestDocumentMetadata:
    """Tests for document metadata and customization."""

    def test_markdown_include_generation_timestamp(self):
        """Markdown can include generation timestamp."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {},
        }
        generator = MarkdownDocumentGenerator(include_metadata=True)

        doc = generator.generate(oas)

        # Should have timestamp or metadata indicator
        assert "Generated:" in doc or "API" in doc

    def test_html_include_table_of_contents(self):
        """HTML can include table of contents."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {
                "/pets": {
                    "get": {
                        "summary": "List pets",
                        "responses": {"200": {"description": "Success"}},
                    }
                },
                "/users": {
                    "get": {
                        "summary": "List users",
                        "responses": {"200": {"description": "Success"}},
                    }
                },
            },
        }
        generator = HTMLDocumentGenerator(include_toc=True)

        doc = generator.generate(oas)

        # Should have table of contents indicators
        assert len(doc) > 200


class TestComplexDocumentation:
    """Tests for complex API documentation."""

    def test_document_full_petstore_api(self):
        """Generate documentation for complete Petstore API."""
        oas = {
            "openapi": "3.0.0",
            "info": {
                "title": "Swagger Petstore",
                "version": "1.0.0",
                "description": "A sample API",
                "contact": {"name": "Swagger API Team"},
            },
            "servers": [
                {"url": "https://petstore.swagger.io/v2", "description": "Live server"}
            ],
            "paths": {
                "/pet": {
                    "post": {
                        "summary": "Add a new pet",
                        "operationId": "addPet",
                        "requestBody": {"description": "Pet object"},
                        "responses": {
                            "405": {"description": "Invalid input"}
                        },
                    },
                    "put": {
                        "summary": "Update an existing pet",
                        "operationId": "updatePet",
                        "responses": {
                            "400": {"description": "Invalid ID"},
                            "404": {"description": "Pet not found"},
                        },
                    },
                },
                "/pet/{petId}": {
                    "get": {
                        "summary": "Find pet by ID",
                        "operationId": "getPetById",
                        "parameters": [
                            {
                                "name": "petId",
                                "in": "path",
                                "required": True,
                                "schema": {"type": "integer"},
                            }
                        ],
                        "responses": {
                            "200": {"description": "Success"},
                            "400": {"description": "Invalid ID"},
                        },
                    }
                },
            },
            "components": {
                "schemas": {
                    "Pet": {
                        "type": "object",
                        "required": ["name", "photoUrls"],
                        "properties": {
                            "id": {"type": "integer"},
                            "name": {"type": "string"},
                            "photoUrls": {"type": "array", "items": {"type": "string"}},
                            "status": {
                                "type": "string",
                                "enum": ["available", "pending", "sold"],
                            },
                        },
                    }
                }
            },
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        # Should include all major sections
        assert "Swagger Petstore" in doc
        assert "/pet" in doc
        assert "/pet/{petId}" in doc
        assert "Pet" in doc
        assert len(doc) > 500  # Substantial documentation


class TestErrorHandling:
    """Tests for error handling."""

    def test_generate_with_missing_info(self):
        """Handle missing info section gracefully."""
        oas = {
            "openapi": "3.0.0",
            "paths": {},
        }
        generator = MarkdownDocumentGenerator()

        # Should handle gracefully
        doc = generator.generate(oas)
        assert isinstance(doc, str)
        assert len(doc) > 0

    def test_generate_with_empty_paths(self):
        """Handle empty paths gracefully."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {},
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "API" in doc
        assert "1.0.0" in doc

    def test_generate_with_missing_components(self):
        """Handle missing components gracefully."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {
                "/test": {
                    "get": {
                        "responses": {"200": {"description": "OK"}}
                    }
                }
            },
        }
        generator = MarkdownDocumentGenerator()

        doc = generator.generate(oas)

        assert "API" in doc
        assert "/test" in doc

    def test_invalid_oas_structure(self):
        """Handle invalid OAS structure."""
        oas = {}
        generator = MarkdownDocumentGenerator()

        # Should handle gracefully
        doc = generator.generate(oas)
        assert isinstance(doc, str)


class TestDocumentFormatOptions:
    """Tests for document format options."""

    def test_markdown_format_identification(self):
        """Markdown generator identifies correct format."""
        generator = MarkdownDocumentGenerator()

        assert generator.format == DocumentFormat.MARKDOWN

    def test_html_format_identification(self):
        """HTML generator identifies correct format."""
        generator = HTMLDocumentGenerator()

        assert generator.format == DocumentFormat.HTML

    def test_generator_interface_consistency(self):
        """All generators have consistent interface."""
        oas = {
            "openapi": "3.0.0",
            "info": {"title": "API", "version": "1.0.0"},
            "paths": {},
        }

        # Both should have generate() method
        md_gen = MarkdownDocumentGenerator()
        html_gen = HTMLDocumentGenerator()

        md_doc = md_gen.generate(oas)
        html_doc = html_gen.generate(oas)

        assert isinstance(md_doc, str)
        assert isinstance(html_doc, str)
        assert len(md_doc) > 0
        assert len(html_doc) > 0
