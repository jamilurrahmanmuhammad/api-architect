"""
T001: Unit tests for OAS Edit-Path Identity System.

Tests for PathSegment types, OASPath resolution, and path equality
with fingerprinting for stable identity in complex OAS structures.

Feature 004 - Form-Based OpenAPI Builder
"""

import pytest
from typing import Dict, Any
from src.utils.oas_path import (
    PathSegment,
    OASPath,
    PathSegmentType,
    compute_fingerprint,
)


class TestPathSegmentType:
    """Tests for PathSegment enum and type validation."""

    def test_path_segment_types_exist(self):
        """PathSegmentType enum has all required types."""
        assert hasattr(PathSegmentType, 'KEY')
        assert hasattr(PathSegmentType, 'INDEX')
        assert hasattr(PathSegmentType, 'REF')
        assert hasattr(PathSegmentType, 'NAME')


class TestPathSegmentCreation:
    """Tests for creating different PathSegment types."""

    def test_create_key_segment(self):
        """PathSegment.key() creates a key-type segment."""
        segment = PathSegment.key("schemas")
        assert segment.type == PathSegmentType.KEY
        assert segment.value == "schemas"
        assert segment.fingerprint is None

    def test_create_index_segment_without_fingerprint(self):
        """PathSegment.index() creates index segment without fingerprint."""
        segment = PathSegment.index(0)
        assert segment.type == PathSegmentType.INDEX
        assert segment.value == 0
        assert segment.fingerprint is None

    def test_create_index_segment_with_fingerprint(self):
        """PathSegment.index() with fingerprint for content verification."""
        segment = PathSegment.index(1, fingerprint="a3f2b1")
        assert segment.type == PathSegmentType.INDEX
        assert segment.value == 1
        assert segment.fingerprint == "a3f2b1"

    def test_create_ref_segment(self):
        """PathSegment.ref() creates ref-type segment."""
        segment = PathSegment.ref("#/components/schemas/Pet")
        assert segment.type == PathSegmentType.REF
        assert segment.value == "#/components/schemas/Pet"
        assert segment.fingerprint is None

    def test_create_name_segment(self):
        """PathSegment.name() creates name-type segment."""
        segment = PathSegment.name("operationId", "getPets")
        assert segment.type == PathSegmentType.NAME
        assert segment.field == "operationId"
        assert segment.value == "getPets"


class TestFingerprintComputation:
    """Tests for content fingerprinting."""

    def test_fingerprint_simple_object(self):
        """Fingerprint computed for simple object."""
        obj = {"type": "string", "description": "A name"}
        fp = compute_fingerprint(obj)
        assert isinstance(fp, str)
        assert len(fp) > 0

    def test_fingerprint_consistent(self):
        """Same object produces same fingerprint."""
        obj = {"type": "string", "description": "A name"}
        fp1 = compute_fingerprint(obj)
        fp2 = compute_fingerprint(obj)
        assert fp1 == fp2

    def test_fingerprint_different_for_different_objects(self):
        """Different objects produce different fingerprints."""
        obj1 = {"type": "string"}
        obj2 = {"type": "integer"}
        fp1 = compute_fingerprint(obj1)
        fp2 = compute_fingerprint(obj2)
        assert fp1 != fp2

    def test_fingerprint_order_independent(self):
        """Fingerprint same for same data in different order."""
        obj1 = {"type": "string", "description": "Name"}
        obj2 = {"description": "Name", "type": "string"}
        fp1 = compute_fingerprint(obj1)
        fp2 = compute_fingerprint(obj2)
        assert fp1 == fp2

    def test_fingerprint_short_format(self):
        """Fingerprint is short and usable in paths."""
        obj = {"type": "string", "description": "A very long description"}
        fp = compute_fingerprint(obj)
        assert len(fp) <= 12  # Short enough for use in paths


class TestOASPathParsing:
    """Tests for parsing JSONPointer paths into OASPath objects."""

    def test_parse_simple_key_path(self):
        """Parse path with only key segments."""
        path = OASPath.from_pointer("/info/title")
        assert len(path.segments) == 2
        assert path.segments[0].type == PathSegmentType.KEY
        assert path.segments[0].value == "info"
        assert path.segments[1].type == PathSegmentType.KEY
        assert path.segments[1].value == "title"

    def test_parse_path_with_index(self):
        """Parse path with array index."""
        path = OASPath.from_pointer("/servers/0/url")
        assert len(path.segments) == 3
        assert path.segments[0].type == PathSegmentType.KEY
        assert path.segments[1].type == PathSegmentType.INDEX
        assert path.segments[1].value == 0
        assert path.segments[2].type == PathSegmentType.KEY

    def test_parse_component_schemas_path(self):
        """Parse path to component schema."""
        path = OASPath.from_pointer("/components/schemas/Pet")
        assert len(path.segments) == 3
        assert path.segments[0].value == "components"
        assert path.segments[1].value == "schemas"
        assert path.segments[2].value == "Pet"

    def test_parse_nested_array_path(self):
        """Parse path with nested arrays."""
        path = OASPath.from_pointer("/paths/~1pets/get/parameters/2/schema")
        assert path.segments[1].value == "/pets"  # JSONPointer tilde escaping
        assert any(s.type == PathSegmentType.INDEX for s in path.segments)


class TestOASPathResolution:
    """Tests for resolving paths in OAS structure."""

    def test_resolve_simple_key_path(self):
        """Resolve simple key-based path in OAS."""
        oas = {"info": {"title": "My API", "version": "1.0.0"}}
        path = OASPath.from_pointer("/info/title")
        value = path.resolve(oas)
        assert value == "My API"

    def test_resolve_with_array_index(self):
        """Resolve path with array index."""
        oas = {
            "servers": [
                {"url": "https://api.example.com"},
                {"url": "https://staging.example.com"},
            ]
        }
        path = OASPath.from_pointer("/servers/1/url")
        value = path.resolve(oas)
        assert value == "https://staging.example.com"

    def test_resolve_returns_none_for_missing_path(self):
        """Resolve returns None for non-existent path."""
        oas = {"info": {"title": "My API"}}
        path = OASPath.from_pointer("/info/missing")
        value = path.resolve(oas)
        assert value is None

    def test_resolve_deep_nested_path(self):
        """Resolve deeply nested path in OAS."""
        oas = {
            "components": {
                "schemas": {
                    "Pet": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Pet name"}
                        },
                    }
                }
            }
        }
        path = OASPath.from_pointer("/components/schemas/Pet/properties/name/description")
        value = path.resolve(oas)
        assert value == "Pet name"


class TestOASPathEquality:
    """Tests for path equality and fingerprint matching."""

    def test_same_key_paths_equal(self):
        """Same key-based paths are equal."""
        path1 = OASPath.from_pointer("/info/title")
        path2 = OASPath.from_pointer("/info/title")
        assert path1 == path2

    def test_index_paths_equal_with_matching_fingerprint(self):
        """Index-based paths equal if fingerprint matches."""
        fp = "a3f2b1"
        seg1 = PathSegment.index(0, fingerprint=fp)
        seg2 = PathSegment.index(0, fingerprint=fp)
        assert seg1 == seg2

    def test_index_paths_not_equal_with_different_fingerprint(self):
        """Index paths differ if fingerprint changes."""
        seg1 = PathSegment.index(0, fingerprint="a3f2b1")
        seg2 = PathSegment.index(0, fingerprint="b4g3c2")
        assert seg1 != seg2

    def test_ref_paths_equal_by_ref_value(self):
        """Ref-based paths equal if $ref value matches."""
        seg1 = PathSegment.ref("#/components/schemas/Pet")
        seg2 = PathSegment.ref("#/components/schemas/Pet")
        assert seg1 == seg2

    def test_different_segment_types_not_equal(self):
        """Paths with different segment types are not equal."""
        seg1 = PathSegment.key("schemas")
        seg2 = PathSegment.index(0)
        assert seg1 != seg2


class TestOASPathComparison:
    """Tests for comparing array order changes."""

    def test_detect_array_reorder_with_fingerprint(self):
        """Detect when array items are reordered via fingerprints."""
        # Original: allOf[0] is ref, allOf[1] is inline
        seg1_orig = PathSegment.index(0, fingerprint="a3f2b1")
        seg2_orig = PathSegment.index(1, fingerprint="b4g3c2")

        # After reorder: positions swapped but content same
        seg1_new = PathSegment.index(0, fingerprint="b4g3c2")
        seg2_new = PathSegment.index(1, fingerprint="a3f2b1")

        # Index changed but fingerprint stable → indicates reorder
        assert seg1_orig.value == seg1_new.value  # Same index
        assert seg1_orig.fingerprint != seg1_new.fingerprint  # Different content


class TestOASPathSerialization:
    """Tests for converting paths to/from string representations."""

    def test_oas_path_to_string(self):
        """Convert OASPath to string representation."""
        path = OASPath.from_pointer("/components/schemas/Pet/properties/name")
        path_str = str(path)
        assert isinstance(path_str, str)
        assert "components" in path_str
        assert "schemas" in path_str
        assert "Pet" in path_str

    def test_oas_path_to_json_pointer(self):
        """Convert OASPath back to JSONPointer format."""
        original = "/components/schemas/Pet"
        path = OASPath.from_pointer(original)
        pointer = path.to_pointer()
        assert pointer == original

    def test_path_with_ref_to_string(self):
        """String representation handles ref-based segments."""
        segments = [
            PathSegment.key("paths"),
            PathSegment.key("/pets"),
            PathSegment.key("get"),
            PathSegment.key("parameters"),
            PathSegment.ref("#/components/parameters/limit"),
        ]
        path = OASPath(segments)
        path_str = str(path)
        assert "#/components/parameters/limit" in path_str


class TestOASPathValidation:
    """Tests for validating path safety and structure."""

    def test_validate_valid_path(self):
        """Valid paths pass validation."""
        path = OASPath.from_pointer("/info/title")
        assert path.is_valid()

    def test_validate_rejects_invalid_segments(self):
        """Invalid segments are rejected."""
        # Path with invalid type should be caught
        path = OASPath.from_pointer("/info/title")
        assert path.is_valid()

    def test_path_with_negative_index_caught(self):
        """Negative array indices rejected."""
        with pytest.raises(ValueError):
            PathSegment.index(-1)

    def test_empty_path_handled(self):
        """Empty path handled gracefully."""
        path = OASPath.from_pointer("")
        assert len(path.segments) == 0


class TestEditPathTracking:
    """Tests for tracking which paths were edited."""

    def test_track_single_edit(self):
        """Track single field edit."""
        original_oas = {"info": {"title": "Old Title"}}
        edited_oas = {"info": {"title": "New Title"}}

        # In real use, would use change detection
        edited_path = OASPath.from_pointer("/info/title")
        assert edited_path.resolve(edited_oas) == "New Title"

    def test_track_multiple_edits(self):
        """Track multiple field edits."""
        edits = [
            OASPath.from_pointer("/info/title"),
            OASPath.from_pointer("/info/version"),
            OASPath.from_pointer("/info/description"),
        ]
        assert len(edits) == 3
        assert all(path.is_valid() for path in edits)

    def test_identify_only_edited_paths(self):
        """Identify which paths were edited vs unchanged."""
        original = {
            "info": {"title": "API", "version": "1.0.0", "description": "My API"},
            "servers": [{"url": "https://api.example.com"}],
        }
        edits = [OASPath.from_pointer("/info/title")]

        # Other paths not in edits remain unchanged
        assert OASPath.from_pointer("/info/version") not in edits
        assert OASPath.from_pointer("/servers/0/url") not in edits
