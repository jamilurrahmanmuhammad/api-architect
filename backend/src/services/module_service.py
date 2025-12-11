"""Module service for loading and managing modules.

T050: GREEN - ModuleService implementation.
"""

from pathlib import Path
from typing import Optional

import yaml

from src.models.module import Module


class ModuleService:
    """Service for loading and querying modules from YAML configuration."""

    def __init__(self, config_path: Optional[Path] = None) -> None:
        """Initialize module service.

        Args:
            config_path: Path to modules.yaml. Defaults to config/modules.yaml.
        """
        if config_path is None:
            config_path = Path(__file__).parent.parent / "config" / "modules.yaml"
        self._config_path = config_path
        self._modules: list[Module] = []
        self._load_modules()

    def _load_modules(self) -> None:
        """Load modules from YAML configuration file."""
        if not self._config_path.exists():
            self._modules = []
            return

        with open(self._config_path) as f:
            data = yaml.safe_load(f)

        raw_modules = data.get("modules", [])
        self._modules = [Module(**m) for m in raw_modules]
        # Sort by order
        self._modules.sort(key=lambda m: m.order)

    def list_modules(self, enabled_only: Optional[bool] = None) -> list[Module]:
        """Get all modules, optionally filtered by enabled status.

        Args:
            enabled_only: If True, return only enabled modules.
                         If False, return only disabled modules.
                         If None, return all modules.

        Returns:
            List of modules sorted by order.
        """
        if enabled_only is None:
            return self._modules.copy()
        return [m for m in self._modules if m.enabled == enabled_only]

    def get_module(self, module_id: str) -> Optional[Module]:
        """Get a module by ID.

        Args:
            module_id: The module identifier.

        Returns:
            Module if found, None otherwise.
        """
        for module in self._modules:
            if module.id == module_id:
                return module
        return None


# Singleton instance
_module_service: Optional[ModuleService] = None


def get_module_service() -> ModuleService:
    """Get or create module service singleton."""
    global _module_service
    if _module_service is None:
        _module_service = ModuleService()
    return _module_service
