"""
T008: Document Generator Service.

Generates API documentation from OpenAPI specifications
in multiple formats (Markdown, HTML, plain text).

Feature 004 - Form-Based OpenAPI Builder
"""

from typing import Dict, List, Any, Optional
from enum import Enum
from datetime import datetime
from abc import ABC, abstractmethod


class DocumentFormat(Enum):
    """Output format for generated documents."""

    MARKDOWN = "markdown"
    HTML = "html"
    PLAINTEXT = "plaintext"


class DocumentStyle(Enum):
    """Style options for HTML documents."""

    COMPACT = "compact"
    PROFESSIONAL = "professional"
    MODERN = "modern"


class GenerationError(Exception):
    """Error during document generation."""

    pass


class BaseDocumentGenerator(ABC):
    """Abstract base for document generators."""

    def __init__(
        self,
        style: DocumentStyle = DocumentStyle.PROFESSIONAL,
        include_metadata: bool = False,
        include_toc: bool = False,
    ):
        """Initialize generator."""
        self.style = style
        self.include_metadata = include_metadata
        self.include_toc = include_toc

    @property
    @abstractmethod
    def format(self) -> DocumentFormat:
        """Return document format."""
        pass

    @abstractmethod
    def generate(self, oas: Dict[str, Any]) -> str:
        """Generate documentation from OAS."""
        pass

    def _get_info(self, oas: Dict[str, Any]) -> Dict[str, Any]:
        """Extract info section."""
        return oas.get("info", {})

    def _get_servers(self, oas: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract servers."""
        return oas.get("servers", [])

    def _get_paths(self, oas: Dict[str, Any]) -> Dict[str, Any]:
        """Extract paths."""
        return oas.get("paths", {})

    def _get_schemas(self, oas: Dict[str, Any]) -> Dict[str, Any]:
        """Extract schemas from components."""
        components = oas.get("components", {})
        return components.get("schemas", {})


class MarkdownDocumentGenerator(BaseDocumentGenerator):
    """Generates Markdown documentation."""

    @property
    def format(self) -> DocumentFormat:
        """Return Markdown format."""
        return DocumentFormat.MARKDOWN

    def generate(self, oas: Dict[str, Any]) -> str:
        """Generate Markdown documentation."""
        lines = []

        # Add metadata if requested
        if self.include_metadata:
            lines.append(f"<!-- Generated: {datetime.utcnow().isoformat()} -->")
            lines.append("")

        # API header
        info = self._get_info(oas)
        title = info.get("title", "API Documentation")
        version = info.get("version", "1.0.0")

        lines.append(f"# {title}")
        lines.append(f"**Version:** {version}")
        lines.append("")

        # Description
        description = info.get("description")
        if description:
            lines.append(description)
            lines.append("")

        # Contact and License
        contact = info.get("contact", {})
        if contact:
            lines.append("## Contact")
            if "name" in contact:
                lines.append(f"- **Name:** {contact['name']}")
            if "email" in contact:
                lines.append(f"- **Email:** {contact['email']}")
            if "url" in contact:
                lines.append(f"- **URL:** {contact['url']}")
            lines.append("")

        license_obj = info.get("license")
        if license_obj:
            lines.append("## License")
            lines.append(f"- **Name:** {license_obj.get('name', 'N/A')}")
            if "url" in license_obj:
                lines.append(f"- **URL:** {license_obj['url']}")
            lines.append("")

        # Servers
        servers = self._get_servers(oas)
        if servers:
            lines.append("## Servers")
            for server in servers:
                url = server.get("url", "")
                desc = server.get("description", "")
                if desc:
                    lines.append(f"- **{desc}:** `{url}`")
                else:
                    lines.append(f"- `{url}`")
            lines.append("")

        # Endpoints
        paths = self._get_paths(oas)
        if paths:
            lines.append("## Endpoints")
            lines.append("")

            for path_name, path_item in paths.items():
                lines.append(f"### {path_name}")
                lines.append("")

                for method, operation in path_item.items():
                    if method.startswith("x-") or method in ("summary", "description", "parameters"):
                        continue

                    method_upper = method.upper()
                    summary = operation.get("summary", "")
                    description = operation.get("description", "")

                    lines.append(f"#### {method_upper}")
                    if summary:
                        lines.append(f"**Summary:** {summary}")
                    if description:
                        lines.append(f"**Description:** {description}")
                    lines.append("")

                    # Operation ID
                    operation_id = operation.get("operationId")
                    if operation_id:
                        lines.append(f"**Operation ID:** `{operation_id}`")
                        lines.append("")

                    # Parameters
                    parameters = operation.get("parameters", [])
                    if parameters:
                        lines.append("**Parameters:**")
                        lines.append("")
                        for param in parameters:
                            param_name = param.get("name", "")
                            param_in = param.get("in", "")
                            param_desc = param.get("description", "")
                            param_required = param.get("required", False)
                            schema = param.get("schema", {})
                            param_type = schema.get("type", "string")

                            required_str = " (required)" if param_required else ""
                            lines.append(f"- `{param_name}` ({param_in}, {param_type}){required_str}")
                            if param_desc:
                                lines.append(f"  - {param_desc}")
                        lines.append("")

                    # Tags
                    tags = operation.get("tags", [])
                    if tags:
                        lines.append(f"**Tags:** {', '.join(tags)}")
                        lines.append("")

                    # Responses
                    responses = operation.get("responses", {})
                    if responses:
                        lines.append("**Responses:**")
                        lines.append("")
                        for status_code, response in responses.items():
                            desc = response.get("description", "")
                            lines.append(f"- **{status_code}:** {desc}")
                        lines.append("")

                lines.append("")

        # Schemas
        schemas = self._get_schemas(oas)
        if schemas:
            lines.append("## Models")
            lines.append("")

            for schema_name, schema in schemas.items():
                lines.append(f"### {schema_name}")
                lines.append("")

                schema_type = schema.get("type", "object")
                lines.append(f"**Type:** `{schema_type}`")
                lines.append("")

                description = schema.get("description")
                if description:
                    lines.append(f"**Description:** {description}")
                    lines.append("")

                # Properties
                properties = schema.get("properties", {})
                if properties:
                    lines.append("**Properties:**")
                    lines.append("")
                    for prop_name, prop_schema in properties.items():
                        prop_type = prop_schema.get("type", "string")
                        prop_desc = prop_schema.get("description", "")
                        lines.append(f"- `{prop_name}` ({prop_type})")
                        if prop_desc:
                            lines.append(f"  - {prop_desc}")
                    lines.append("")

                # Required fields
                required = schema.get("required", [])
                if required:
                    lines.append("**Required:** " + ", ".join([f"`{f}`" for f in required]))
                    lines.append("")

                lines.append("")

        return "\n".join(lines)


class HTMLDocumentGenerator(BaseDocumentGenerator):
    """Generates HTML documentation."""

    @property
    def format(self) -> DocumentFormat:
        """Return HTML format."""
        return DocumentFormat.HTML

    def generate(self, oas: Dict[str, Any]) -> str:
        """Generate HTML documentation."""
        info = self._get_info(oas)
        title = info.get("title", "API Documentation")
        version = info.get("version", "1.0.0")
        description = info.get("description", "")

        html_parts = []

        # HTML header
        html_parts.append("<!DOCTYPE html>")
        html_parts.append("<html>")
        html_parts.append("<head>")
        html_parts.append(f"<title>{title}</title>")
        html_parts.append("<meta charset='utf-8'>")
        html_parts.append("<meta name='viewport' content='width=device-width, initial-scale=1'>")
        html_parts.append(self._get_css_styles())
        html_parts.append("</head>")
        html_parts.append("<body>")

        # Container
        html_parts.append('<div class="container">')

        # Header
        html_parts.append("<header>")
        html_parts.append(f"<h1>{title}</h1>")
        html_parts.append(f"<p class='version'>Version {version}</p>")
        if description:
            html_parts.append(f"<p class='description'>{description}</p>")
        html_parts.append("</header>")

        # Table of Contents
        if self.include_toc:
            html_parts.append(self._generate_toc_html(oas))

        # Content
        html_parts.append('<main>')

        # Contact and License
        contact = info.get("contact", {})
        if contact:
            html_parts.append("<section>")
            html_parts.append("<h2>Contact</h2>")
            html_parts.append("<ul>")
            if "name" in contact:
                html_parts.append(f"<li><strong>Name:</strong> {contact['name']}</li>")
            if "email" in contact:
                html_parts.append(f"<li><strong>Email:</strong> {contact['email']}</li>")
            if "url" in contact:
                html_parts.append(f"<li><strong>URL:</strong> <a href='{contact['url']}'>{contact['url']}</a></li>")
            html_parts.append("</ul>")
            html_parts.append("</section>")

        license_obj = info.get("license")
        if license_obj:
            html_parts.append("<section>")
            html_parts.append("<h2>License</h2>")
            html_parts.append("<ul>")
            html_parts.append(f"<li><strong>Name:</strong> {license_obj.get('name', 'N/A')}</li>")
            if "url" in license_obj:
                html_parts.append(
                    f"<li><strong>URL:</strong> <a href='{license_obj['url']}'>{license_obj['url']}</a></li>"
                )
            html_parts.append("</ul>")
            html_parts.append("</section>")

        # Servers
        servers = self._get_servers(oas)
        if servers:
            html_parts.append("<section>")
            html_parts.append("<h2>Servers</h2>")
            html_parts.append("<ul>")
            for server in servers:
                url = server.get("url", "")
                desc = server.get("description", "")
                if desc:
                    html_parts.append(f"<li><strong>{desc}:</strong> <code>{url}</code></li>")
                else:
                    html_parts.append(f"<li><code>{url}</code></li>")
            html_parts.append("</ul>")
            html_parts.append("</section>")

        # Endpoints
        paths = self._get_paths(oas)
        if paths:
            html_parts.append("<section>")
            html_parts.append("<h2>Endpoints</h2>")

            for path_name, path_item in paths.items():
                html_parts.append(f"<div class='endpoint'>")
                html_parts.append(f"<h3>{path_name}</h3>")

                for method, operation in path_item.items():
                    if method.startswith("x-") or method in ("summary", "description", "parameters"):
                        continue

                    method_upper = method.upper()
                    summary = operation.get("summary", "")
                    description = operation.get("description", "")

                    html_parts.append(f"<div class='operation'>")
                    html_parts.append(f"<h4><span class='method {method_upper}'>{method_upper}</span> {path_name}</h4>")

                    if summary:
                        html_parts.append(f"<p class='summary'><strong>Summary:</strong> {summary}</p>")
                    if description:
                        html_parts.append(f"<p class='description'>{description}</p>")

                    # Operation ID
                    operation_id = operation.get("operationId")
                    if operation_id:
                        html_parts.append(f"<p><strong>Operation ID:</strong> <code>{operation_id}</code></p>")

                    # Parameters
                    parameters = operation.get("parameters", [])
                    if parameters:
                        html_parts.append("<div class='parameters'>")
                        html_parts.append("<h5>Parameters</h5>")
                        html_parts.append("<table>")
                        html_parts.append("<tr><th>Name</th><th>In</th><th>Type</th><th>Description</th></tr>")
                        for param in parameters:
                            param_name = param.get("name", "")
                            param_in = param.get("in", "")
                            param_desc = param.get("description", "")
                            schema = param.get("schema", {})
                            param_type = schema.get("type", "string")
                            html_parts.append(f"<tr><td><code>{param_name}</code></td><td>{param_in}</td><td>{param_type}</td><td>{param_desc}</td></tr>")
                        html_parts.append("</table>")
                        html_parts.append("</div>")

                    # Tags
                    tags = operation.get("tags", [])
                    if tags:
                        html_parts.append(f"<p><strong>Tags:</strong> {', '.join(tags)}</p>")

                    # Responses
                    responses = operation.get("responses", {})
                    if responses:
                        html_parts.append("<div class='responses'>")
                        html_parts.append("<h5>Responses</h5>")
                        html_parts.append("<ul>")
                        for status_code, response in responses.items():
                            desc = response.get("description", "")
                            html_parts.append(f"<li><strong>{status_code}:</strong> {desc}</li>")
                        html_parts.append("</ul>")
                        html_parts.append("</div>")

                    html_parts.append(f"</div>")  # operation

                html_parts.append(f"</div>")  # endpoint

            html_parts.append("</section>")

        # Schemas
        schemas = self._get_schemas(oas)
        if schemas:
            html_parts.append("<section>")
            html_parts.append("<h2>Models</h2>")

            for schema_name, schema in schemas.items():
                html_parts.append(f"<div class='schema'>")
                html_parts.append(f"<h3>{schema_name}</h3>")

                schema_type = schema.get("type", "object")
                html_parts.append(f"<p><strong>Type:</strong> <code>{schema_type}</code></p>")

                description = schema.get("description")
                if description:
                    html_parts.append(f"<p><strong>Description:</strong> {description}</p>")

                # Properties
                properties = schema.get("properties", {})
                if properties:
                    html_parts.append("<div class='properties'>")
                    html_parts.append("<h4>Properties</h4>")
                    html_parts.append("<table>")
                    html_parts.append("<tr><th>Property</th><th>Type</th><th>Description</th></tr>")
                    for prop_name, prop_schema in properties.items():
                        prop_type = prop_schema.get("type", "string")
                        prop_desc = prop_schema.get("description", "")
                        html_parts.append(f"<tr><td><code>{prop_name}</code></td><td>{prop_type}</td><td>{prop_desc}</td></tr>")
                    html_parts.append("</table>")
                    html_parts.append("</div>")

                # Required fields
                required = schema.get("required", [])
                if required:
                    html_parts.append(f"<p><strong>Required:</strong> {', '.join([f'<code>{f}</code>' for f in required])}</p>")

                html_parts.append(f"</div>")  # schema

            html_parts.append("</section>")

        html_parts.append('</main>')

        # Footer
        html_parts.append("<footer>")
        html_parts.append(f"<p>Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>")
        html_parts.append("</footer>")

        # Close
        html_parts.append('</div>')  # container
        html_parts.append("</body>")
        html_parts.append("</html>")

        return "\n".join(html_parts)

    def _get_css_styles(self) -> str:
        """Get CSS styles for HTML document."""
        if self.style == DocumentStyle.COMPACT:
            return self._get_compact_css()
        elif self.style == DocumentStyle.MODERN:
            return self._get_modern_css()
        else:  # PROFESSIONAL (default)
            return self._get_professional_css()

    def _get_professional_css(self) -> str:
        """Professional CSS styling."""
        return """<style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f5f5f5;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background-color: white;
                padding: 20px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            header {
                border-bottom: 3px solid #007bff;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            h1 { color: #007bff; font-size: 2.5em; margin: 0; }
            h2 { color: #0056b3; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            h3 { color: #0056b3; }
            h4 { color: #333; }
            h5 { font-size: 0.95em; color: #666; }
            .version { color: #666; font-size: 1.1em; margin: 10px 0 0 0; }
            .description { color: #666; font-style: italic; }
            section { margin-bottom: 40px; }
            .endpoint { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #007bff; }
            .operation { margin: 15px 0; padding: 15px; background-color: white; border: 1px solid #ddd; }
            .method { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; }
            .method.GET { background-color: #28a745; }
            .method.POST { background-color: #007bff; }
            .method.PUT { background-color: #ffc107; }
            .method.DELETE { background-color: #dc3545; }
            .method.PATCH { background-color: #6f42c1; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f0f0f0; font-weight: bold; }
            code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
            .schema { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #28a745; }
            footer { text-align: center; color: #999; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>"""

    def _get_compact_css(self) -> str:
        """Compact CSS styling."""
        return """<style>
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; }
            .container { padding: 10px; }
            h1 { font-size: 1.8em; margin: 0; }
            h2 { font-size: 1.3em; }
            section { margin: 15px 0; }
            .endpoint { margin: 10px 0; padding: 10px; background-color: #f0f0f0; }
            table { border-collapse: collapse; }
            th, td { padding: 5px; border: 1px solid #ccc; text-align: left; }
            code { background-color: #f4f4f4; }
        </style>"""

    def _get_modern_css(self) -> str:
        """Modern CSS styling."""
        return """<style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.7;
                color: #2c3e50;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                overflow: hidden;
            }
            header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
            }
            h1 { margin: 0; font-size: 2.5em; }
            h2 { color: #667eea; border-left: 5px solid #667eea; padding-left: 15px; }
            h3 { color: #764ba2; }
            section { padding: 20px 30px; border-bottom: 1px solid #eee; }
            .endpoint { background: #f8f9ff; border-radius: 5px; padding: 15px; margin: 10px 0; }
            .method { display: inline-block; padding: 5px 12px; border-radius: 20px; color: white; font-weight: bold; }
            .method.GET { background-color: #27ae60; }
            .method.POST { background-color: #3498db; }
            .method.PUT { background-color: #f39c12; }
            .method.DELETE { background-color: #e74c3c; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #667eea; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            footer { text-align: center; color: #999; padding: 20px; }
        </style>"""

    def _generate_toc_html(self, oas: Dict[str, Any]) -> str:
        """Generate table of contents."""
        html_parts = []
        html_parts.append('<nav class="toc">')
        html_parts.append("<h2>Table of Contents</h2>")
        html_parts.append("<ul>")

        paths = self._get_paths(oas)
        if paths:
            html_parts.append("<li><a href='#endpoints'>Endpoints</a></li>")

        schemas = self._get_schemas(oas)
        if schemas:
            html_parts.append("<li><a href='#models'>Models</a></li>")

        html_parts.append("</ul>")
        html_parts.append("</nav>")

        return "\n".join(html_parts)
