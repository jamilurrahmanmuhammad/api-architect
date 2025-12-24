"""
T005: OAS Merge Service for surgical editing.

Applies edit transactions to OAS documents while preserving untouched structures.

Feature 004 - Form-Based OpenAPI Builder
"""

from typing import Dict, List, Any, Optional
from copy import deepcopy
import json
import yaml

from src.db.migrations.migration_001_create_oas_specs_table import OASEditTransaction
from src.utils.oas_path import OASPath


class MergeResult:
    """Result of merging OAS document with transactions."""

    def __init__(
        self,
        merged_oas: Dict[str, Any],
        edits_applied: int = 0,
        edits_failed: List[str] = None,
    ):
        """Initialize merge result."""
        self.merged_oas = merged_oas
        self.edits_applied = edits_applied
        self.edits_failed = edits_failed or []

    def to_yaml(self) -> str:
        """Convert merged OAS to YAML."""
        return yaml.dump(self.merged_oas, default_flow_style=False, sort_keys=False)

    def to_json(self) -> str:
        """Convert merged OAS to JSON."""
        return json.dumps(self.merged_oas, indent=2)

    def __repr__(self) -> str:
        """String representation."""
        return f"MergeResult(applied={self.edits_applied}, failed={len(self.edits_failed)})"


class OASMergeService:
    """
    Merges edit transactions into OAS documents.

    Implements surgical editing:
    - Apply only edits that were made (by path)
    - Preserve untouched structures exactly
    - Support create/update/delete operations
    - Maintain array order from original
    - Preserve vendor extensions (x-* properties)
    """

    def __init__(self):
        """Initialize merge service."""
        pass

    def merge(
        self,
        original_oas: str,
        transactions: List[OASEditTransaction],
        content_format: str = "yaml",
    ) -> MergeResult:
        """
        Merge transactions into OAS document.

        Args:
            original_oas: Original OAS content (YAML or JSON string)
            transactions: List of edit transactions to apply
            content_format: "yaml" or "json"

        Returns:
            MergeResult with merged document
        """
        # Parse original OAS
        try:
            oas_dict = self._parse_content(original_oas, content_format)
        except Exception as e:
            return MergeResult(
                merged_oas={},
                edits_applied=0,
                edits_failed=[f"Failed to parse original OAS: {str(e)}"],
            )

        # Apply transactions in chronological order
        edits_applied = 0
        edits_failed = []

        for transaction in transactions:
            try:
                self._apply_transaction(oas_dict, transaction)
                edits_applied += 1
            except Exception as e:
                edits_failed.append(
                    f"Transaction {transaction.id} failed: {str(e)}"
                )

        return MergeResult(
            merged_oas=oas_dict,
            edits_applied=edits_applied,
            edits_failed=edits_failed,
        )

    def merge_from_dict(
        self,
        original_oas: Dict[str, Any],
        transactions: List[OASEditTransaction],
    ) -> MergeResult:
        """
        Merge transactions into OAS dict (already parsed).

        Args:
            original_oas: Original OAS as dictionary
            transactions: List of edit transactions

        Returns:
            MergeResult with merged document
        """
        # Deep copy to avoid modifying original
        oas_dict = deepcopy(original_oas)

        edits_applied = 0
        edits_failed = []

        for transaction in transactions:
            try:
                self._apply_transaction(oas_dict, transaction)
                edits_applied += 1
            except Exception as e:
                edits_failed.append(
                    f"Transaction {transaction.id} failed: {str(e)}"
                )

        return MergeResult(
            merged_oas=oas_dict,
            edits_applied=edits_applied,
            edits_failed=edits_failed,
        )

    def _apply_transaction(
        self,
        oas_dict: Dict[str, Any],
        transaction: OASEditTransaction,
    ) -> None:
        """
        Apply single transaction to OAS dict.

        Args:
            oas_dict: OAS document to modify (modified in place)
            transaction: Transaction to apply
        """
        path = OASPath.from_pointer(transaction.edit_path)

        if transaction.change_type == "update":
            self._apply_update(oas_dict, path, transaction.new_value)
        elif transaction.change_type == "create":
            self._apply_create(oas_dict, path, transaction.new_value)
        elif transaction.change_type == "delete":
            self._apply_delete(oas_dict, path)

    def _apply_update(
        self,
        oas_dict: Dict[str, Any],
        path: OASPath,
        new_value_str: Optional[str],
    ) -> None:
        """Apply update transaction."""
        if not path.segments:
            # Cannot update root
            return

        # Navigate to parent and get key
        parent = oas_dict
        for segment in path.segments[:-1]:
            parent = self._navigate_segment(parent, segment)
            if parent is None:
                raise ValueError(f"Cannot navigate to parent of {path}")

        last_segment = path.segments[-1]

        # Parse new value
        new_value = self._parse_value(new_value_str)

        # Set the value
        self._set_value(parent, last_segment, new_value)

    def _apply_create(
        self,
        oas_dict: Dict[str, Any],
        path: OASPath,
        new_value_str: Optional[str],
    ) -> None:
        """Apply create transaction."""
        if not path.segments:
            raise ValueError("Cannot create at root")

        # Navigate to parent
        parent = oas_dict
        for segment in path.segments[:-1]:
            parent = self._navigate_segment(parent, segment)
            if parent is None:
                # Create intermediate structures if needed
                parent = self._ensure_path(oas_dict, path.segments[:-1])

        last_segment = path.segments[-1]

        # Parse new value
        new_value = self._parse_value(new_value_str)

        # Create the value (fail if already exists)
        if isinstance(parent, dict):
            if last_segment.value in parent:
                raise ValueError(f"Field {last_segment.value} already exists")
            parent[last_segment.value] = new_value
        elif isinstance(parent, list):
            # For arrays, append to end
            parent.append(new_value)

    def _apply_delete(
        self,
        oas_dict: Dict[str, Any],
        path: OASPath,
    ) -> None:
        """Apply delete transaction."""
        if not path.segments:
            raise ValueError("Cannot delete root")

        # Navigate to parent
        parent = oas_dict
        for segment in path.segments[:-1]:
            parent = self._navigate_segment(parent, segment)
            if parent is None:
                return  # Parent doesn't exist, nothing to delete

        last_segment = path.segments[-1]

        # Delete the value
        if isinstance(parent, dict):
            if last_segment.value in parent:
                del parent[last_segment.value]
        elif isinstance(parent, list):
            if isinstance(last_segment.value, int):
                try:
                    parent.pop(last_segment.value)
                except IndexError:
                    pass

    def _navigate_segment(
        self,
        current: Any,
        segment: "PathSegment",
    ) -> Any:
        """Navigate to next level using segment."""
        from src.utils.oas_path import PathSegmentType

        if segment.type == PathSegmentType.KEY:
            if isinstance(current, dict):
                return current.get(segment.value)
        elif segment.type == PathSegmentType.INDEX:
            if isinstance(current, list):
                try:
                    return current[segment.value]
                except IndexError:
                    return None
        elif segment.type == PathSegmentType.REF:
            # $ref resolution not implemented for merge
            return None
        elif segment.type == PathSegmentType.NAME:
            # Name-based navigation
            if isinstance(current, dict):
                for key, value in current.items():
                    if isinstance(value, dict) and value.get(segment.field) == segment.value:
                        return value
        return None

    def _set_value(
        self,
        parent: Any,
        segment: "PathSegment",
        value: Any,
    ) -> None:
        """Set value at segment in parent."""
        from src.utils.oas_path import PathSegmentType

        if segment.type == PathSegmentType.KEY:
            if isinstance(parent, dict):
                parent[segment.value] = value
        elif segment.type == PathSegmentType.INDEX:
            if isinstance(parent, list):
                # Extend list if needed
                while len(parent) <= segment.value:
                    parent.append(None)
                parent[segment.value] = value

    def _ensure_path(
        self,
        oas_dict: Dict[str, Any],
        segments: List["PathSegment"],
    ) -> Optional[Dict[str, Any]]:
        """Ensure path exists, creating intermediate objects if needed."""
        from src.utils.oas_path import PathSegmentType

        current = oas_dict

        for segment in segments:
            if segment.type == PathSegmentType.KEY:
                if segment.value not in current:
                    current[segment.value] = {}
                current = current[segment.value]
            elif segment.type == PathSegmentType.INDEX:
                if not isinstance(current, list):
                    raise ValueError(f"Cannot use index on non-list")
                while len(current) <= segment.value:
                    current.append({})
                current = current[segment.value]

        return current

    def _parse_value(self, value_str: Optional[str]) -> Any:
        """Parse value string to Python object."""
        if value_str is None:
            return None

        # Try to parse as JSON first (handles numbers, booleans, arrays, objects)
        try:
            return json.loads(value_str)
        except (json.JSONDecodeError, TypeError):
            # Fall back to plain string
            return value_str

    def _parse_content(self, content: str, content_format: str) -> Dict[str, Any]:
        """Parse YAML or JSON content."""
        if content_format == "json":
            return json.loads(content)
        elif content_format == "yaml":
            return yaml.safe_load(content) or {}
        else:
            raise ValueError(f"Unsupported format: {content_format}")

    def compute_diff(
        self,
        original_oas: str,
        merged_oas: str,
        content_format: str = "yaml",
    ) -> Dict[str, Any]:
        """
        Compute diff between original and merged OAS.

        Args:
            original_oas: Original OAS content
            merged_oas: Merged OAS content
            content_format: "yaml" or "json"

        Returns:
            Dictionary with diff information
        """
        original_dict = self._parse_content(original_oas, content_format)
        merged_dict = self._parse_content(merged_oas, content_format)

        return self._compute_diff_recursive(original_dict, merged_dict, "$")

    def _compute_diff_recursive(
        self,
        original: Any,
        merged: Any,
        path: str,
    ) -> Dict[str, Any]:
        """Recursively compute differences."""
        diff = {"changes": []}

        if type(original) != type(merged):
            diff["changes"].append(
                {
                    "path": path,
                    "type": "type_change",
                    "original_type": type(original).__name__,
                    "new_type": type(merged).__name__,
                }
            )
            return diff

        if isinstance(original, dict):
            # Check for added/modified keys
            for key in merged:
                if key not in original:
                    diff["changes"].append(
                        {
                            "path": f"{path}.{key}",
                            "type": "added",
                            "value": merged[key],
                        }
                    )
                elif original[key] != merged[key]:
                    sub_diff = self._compute_diff_recursive(
                        original[key],
                        merged[key],
                        f"{path}.{key}",
                    )
                    diff["changes"].extend(sub_diff["changes"])

            # Check for removed keys
            for key in original:
                if key not in merged:
                    diff["changes"].append(
                        {
                            "path": f"{path}.{key}",
                            "type": "removed",
                            "value": original[key],
                        }
                    )

        elif isinstance(original, list):
            if len(original) != len(merged):
                diff["changes"].append(
                    {
                        "path": path,
                        "type": "length_change",
                        "original_length": len(original),
                        "new_length": len(merged),
                    }
                )
            # Check element changes
            for i, (orig_item, merged_item) in enumerate(zip(original, merged)):
                if orig_item != merged_item:
                    sub_diff = self._compute_diff_recursive(
                        orig_item,
                        merged_item,
                        f"{path}[{i}]",
                    )
                    diff["changes"].extend(sub_diff["changes"])

        elif original != merged:
            diff["changes"].append(
                {
                    "path": path,
                    "type": "value_change",
                    "original_value": original,
                    "new_value": merged,
                }
            )

        return diff
