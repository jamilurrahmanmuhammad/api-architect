"""
T001: OAS Edit-Path Identity System.

Implements stable path identity for OAS structures with support for:
- Key-based paths (object properties)
- Index-based paths with fingerprinting (array items)
- Reference-based paths ($ref values)
- Named-based paths (operationId, etc.)

This system enables surgical editing by reliably tracking which OAS paths
were modified by users, even when array orders or structures change.

Feature 004 - Form-Based OpenAPI Builder
"""

import hashlib
import json
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field


class PathSegmentType(Enum):
    """Types of path segments in an OAS structure."""

    KEY = "key"  # Object property: "schemas"
    INDEX = "index"  # Array index: [0]
    REF = "ref"  # $ref value: "#/components/schemas/Pet"
    NAME = "name"  # Named identity: operationId="getPets"


@dataclass
class PathSegment:
    """Represents a single segment in an OAS path."""

    type: PathSegmentType
    value: Any
    fingerprint: Optional[str] = None  # For index stability
    field: Optional[str] = None  # For name-based identity

    @staticmethod
    def key(value: str) -> "PathSegment":
        """Create a key-type segment."""
        return PathSegment(type=PathSegmentType.KEY, value=value)

    @staticmethod
    def index(value: int, fingerprint: Optional[str] = None) -> "PathSegment":
        """Create an index-type segment with optional content fingerprint."""
        if value < 0:
            raise ValueError("Array index must be non-negative")
        return PathSegment(type=PathSegmentType.INDEX, value=value, fingerprint=fingerprint)

    @staticmethod
    def ref(value: str) -> "PathSegment":
        """Create a ref-type segment (e.g., $ref value)."""
        return PathSegment(type=PathSegmentType.REF, value=value)

    @staticmethod
    def name(field: str, value: str) -> "PathSegment":
        """Create a name-type segment (e.g., operationId)."""
        return PathSegment(type=PathSegmentType.NAME, value=value, field=field)

    def __eq__(self, other: Any) -> bool:
        """Segments equal if type, value, and fingerprint match."""
        if not isinstance(other, PathSegment):
            return False

        # For ref-based, compare only $ref value
        if self.type == PathSegmentType.REF:
            return self.value == other.value

        # For index-based with fingerprint, compare both index and fingerprint
        if self.type == PathSegmentType.INDEX:
            if self.fingerprint and other.fingerprint:
                return self.value == other.value and self.fingerprint == other.fingerprint
            # If one has fingerprint and other doesn't, they're different
            if bool(self.fingerprint) != bool(other.fingerprint):
                return False
            return self.value == other.value

        # For key and name, compare all fields
        return (
            self.type == other.type
            and self.value == other.value
            and self.field == other.field
        )

    def __repr__(self) -> str:
        """String representation of segment."""
        if self.type == PathSegmentType.KEY:
            return f"key({self.value})"
        elif self.type == PathSegmentType.INDEX:
            fp_str = f":{self.fingerprint[:8]}" if self.fingerprint else ""
            return f"index[{self.value}{fp_str}]"
        elif self.type == PathSegmentType.REF:
            return f"ref({self.value})"
        elif self.type == PathSegmentType.NAME:
            return f"name({self.field}={self.value})"
        return str(self.type)


def compute_fingerprint(obj: Any) -> str:
    """
    Compute a short, stable fingerprint for an object.

    Used to verify array item identity across reordering.
    Returns a short hash (8 chars) suitable for use in paths.

    Args:
        obj: Object to fingerprint (dict, list, primitive)

    Returns:
        Hex string fingerprint (8 characters)
    """
    # Serialize to canonical JSON for consistent hashing
    if isinstance(obj, dict):
        # Sort keys for order-independent hashing
        json_str = json.dumps(obj, sort_keys=True, separators=(',', ':'))
    elif isinstance(obj, list):
        json_str = json.dumps(obj, separators=(',', ':'))
    else:
        json_str = json.dumps(obj)

    # Compute SHA256 hash
    hash_obj = hashlib.sha256(json_str.encode())
    full_hash = hash_obj.hexdigest()

    # Return first 8 characters for compactness
    return full_hash[:8]


class OASPath:
    """
    Represents a path to a location in an OAS structure.

    Supports multiple identity strategies:
    - Key-based: Object properties (most common)
    - Index-based: Array items with fingerprints for stability
    - Ref-based: $ref values (stable identity)
    - Name-based: Named identifiers like operationId

    Example paths:
        /info/title → [key("info"), key("title")]
        /servers/0/url → [key("servers"), index(0), key("url")]
        /components/schemas/Pet → [key("components"), key("schemas"), key("Pet")]
    """

    def __init__(self, segments: List[PathSegment]):
        """Initialize OASPath with segments."""
        self.segments = segments

    @staticmethod
    def from_pointer(pointer: str) -> "OASPath":
        """
        Parse JSONPointer format path into OASPath.

        JSONPointer format (RFC 6901):
        - "" or "/" → root
        - "/foo/bar" → ["foo", "bar"]
        - "/0" → array index 0
        - "/~0" → escaped tilde
        - "/~1" → escaped slash

        Args:
            pointer: JSONPointer string

        Returns:
            OASPath with parsed segments
        """
        if not pointer or pointer == "/":
            return OASPath([])

        segments = []
        # Remove leading slash if present
        if pointer.startswith("/"):
            pointer = pointer[1:]

        # Split by / and unescape
        parts = pointer.split("/")
        for part in parts:
            # Unescape: ~1 → /, ~0 → ~
            part = part.replace("~1", "/").replace("~0", "~")

            # Try to parse as array index
            try:
                index = int(part)
                segments.append(PathSegment.index(index))
            except ValueError:
                # Not an integer, treat as key
                segments.append(PathSegment.key(part))

        return OASPath(segments)

    def resolve(self, oas: Dict[str, Any]) -> Any:
        """
        Resolve this path in an OAS structure.

        Returns the value at this path, or None if path doesn't exist.

        Args:
            oas: OAS structure to resolve in

        Returns:
            Value at path, or None if not found
        """
        current = oas

        for segment in self.segments:
            if current is None:
                return None

            if segment.type == PathSegmentType.KEY:
                if isinstance(current, dict):
                    current = current.get(segment.value)
                else:
                    return None

            elif segment.type == PathSegmentType.INDEX:
                if isinstance(current, list):
                    try:
                        current = current[segment.value]
                    except (IndexError, TypeError):
                        return None
                else:
                    return None

            elif segment.type == PathSegmentType.REF:
                # $ref resolution would require special handling
                # For now, this is primarily for identity tracking
                return None

            elif segment.type == PathSegmentType.NAME:
                # Name-based resolution (e.g., find by operationId)
                if isinstance(current, dict):
                    # Search for matching field value
                    for key, value in current.items():
                        if isinstance(value, dict) and value.get(segment.field) == segment.value:
                            current = value
                            break
                    else:
                        return None
                else:
                    return None

        return current

    def to_pointer(self) -> str:
        """
        Convert OASPath back to JSONPointer format.

        Returns:
            JSONPointer string
        """
        if not self.segments:
            return ""

        parts = []
        for segment in self.segments:
            if segment.type == PathSegmentType.KEY:
                # Escape special characters
                part = str(segment.value)
                part = part.replace("~", "~0").replace("/", "~1")
                parts.append(part)
            elif segment.type == PathSegmentType.INDEX:
                parts.append(str(segment.value))
            elif segment.type == PathSegmentType.REF:
                # REF segments don't appear in JSONPointer
                pass
            elif segment.type == PathSegmentType.NAME:
                # NAME segments encoded as key
                parts.append(f"{segment.field}={segment.value}")

        return "/" + "/".join(parts)

    def is_valid(self) -> bool:
        """
        Check if path is valid.

        Returns:
            True if path structure is valid
        """
        for segment in self.segments:
            # Check index bounds
            if segment.type == PathSegmentType.INDEX:
                if segment.value < 0:
                    return False

        return True

    def __eq__(self, other: Any) -> bool:
        """Paths equal if all segments match."""
        if not isinstance(other, OASPath):
            return False

        if len(self.segments) != len(other.segments):
            return False

        return all(s1 == s2 for s1, s2 in zip(self.segments, other.segments))

    def __repr__(self) -> str:
        """String representation of path."""
        if not self.segments:
            return "OASPath(root)"
        return f"OASPath({self.to_pointer()})"

    def __str__(self) -> str:
        """Readable string representation."""
        parts = []
        for segment in self.segments:
            if segment.type == PathSegmentType.KEY:
                parts.append(f".{segment.value}")
            elif segment.type == PathSegmentType.INDEX:
                fp_str = f":{segment.fingerprint[:8]}" if segment.fingerprint else ""
                parts.append(f"[{segment.value}{fp_str}]")
            elif segment.type == PathSegmentType.REF:
                parts.append(f"[$ref={segment.value}]")
            elif segment.type == PathSegmentType.NAME:
                parts.append(f"[{segment.field}={segment.value}]")

        return "root" + "".join(parts)


class EditPathTracker:
    """
    Tracks which OAS paths were modified by user edits.

    Enables surgical editing: when exporting, only modified paths
    are included in edit transaction, untouched structures preserved.
    """

    def __init__(self):
        """Initialize tracker with empty edit set."""
        self.edited_paths: List[OASPath] = []

    def mark_edited(self, path: OASPath) -> None:
        """Mark a path as edited by user."""
        if path not in self.edited_paths:
            self.edited_paths.append(path)

    def is_edited(self, path: OASPath) -> bool:
        """Check if path was edited."""
        return path in self.edited_paths

    def get_edited_paths(self) -> List[OASPath]:
        """Get all edited paths."""
        return self.edited_paths.copy()

    def clear(self) -> None:
        """Clear all tracked edits."""
        self.edited_paths = []

    def __repr__(self) -> str:
        """String representation."""
        return f"EditPathTracker({len(self.edited_paths)} edits)"


# Utility function for computing fingerprints with array items
def fingerprint_array_items(items: List[Dict[str, Any]]) -> List[str]:
    """
    Compute fingerprints for all items in array.

    Useful for tracking array item identity across reordering.

    Args:
        items: List of objects to fingerprint

    Returns:
        List of fingerprints (same order as items)
    """
    return [compute_fingerprint(item) for item in items]


def detect_array_reorder(
    original_items: List[Dict[str, Any]],
    modified_items: List[Dict[str, Any]],
) -> bool:
    """
    Detect if array items were reordered.

    Args:
        original_items: Original array
        modified_items: Modified array

    Returns:
        True if items were reordered (same items, different order)
    """
    if len(original_items) != len(modified_items):
        return False

    original_fps = set(compute_fingerprint(item) for item in original_items)
    modified_fps = set(compute_fingerprint(item) for item in modified_items)

    # Same fingerprints means same items, different order = reorder
    return original_fps == modified_fps
