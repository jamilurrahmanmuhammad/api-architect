import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata

# Import the Base from models to support autogenerate
# This will be available after ORM models are created in Phase 2
try:
    from src.models.file import Base
    target_metadata = Base.metadata
except ImportError:
    # Models not yet created; target_metadata will be None for now
    target_metadata = None

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Load DATABASE_URL from environment, fallback to config
    url = os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url")

    # Convert async URL to sync URL for offline mode
    if url and url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Load DATABASE_URL from environment, fallback to config
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = config.get_main_option("sqlalchemy.url")

    # Create sync engine for migrations (Alembic doesn't support async migrations directly)
    if database_url:
        # Convert async URL to sync URL
        sync_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
        configuration = config.get_section(config.config_ini_section, {})
        configuration["sqlalchemy.url"] = sync_url
    else:
        configuration = config.get_section(config.config_ini_section, {})

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
