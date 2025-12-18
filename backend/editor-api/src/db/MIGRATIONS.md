# Database Migrations Guide

This directory contains Alembic migrations for managing database schema evolution in the API Architect Editor API.

## Overview

Alembic is an SQLAlchemy migration toolkit that provides:
- **Version control** for database schemas
- **Reproducible deployments** across environments
- **Rollback capability** for failed migrations
- **Autogeneration** of migration scripts from ORM models

## Configuration

### Environment Variables

The migration system reads the following environment variables:

- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql+asyncpg://user:password@localhost:5432/api_architect_editor`)
- Falls back to `sqlalchemy.url` in `alembic.ini` if not set

### Async Support

The application uses async PostgreSQL via asyncpg, but Alembic runs migrations synchronously. The `env.py` script automatically:
1. Loads `DATABASE_URL` from environment
2. Converts `postgresql+asyncpg://` URLs to synchronous `postgresql://` format
3. Executes migrations using a sync SQLAlchemy engine

## Workflow

### Creating a New Migration

**Automatic (Recommended)**

After modifying ORM models in `src/models/`, generate a migration automatically:

```bash
# From backend/editor-api directory
alembic revision --autogenerate -m "Describe your changes here"
```

Example:
```bash
alembic revision --autogenerate -m "Add user authentication tables"
```

This inspects the database schema and your ORM models, then generates migration code in `src/db/migrations/versions/`.

**Manual**

For complex changes or when autogenerate doesn't capture your intent:

```bash
alembic revision -m "Describe your changes"
```

Then edit the generated file in `src/db/migrations/versions/` to add your SQL operations.

### Applying Migrations

Apply all pending migrations to your database:

```bash
# From backend/editor-api directory
alembic upgrade head
```

Apply a specific number of migrations:

```bash
alembic upgrade +2  # Apply next 2 migrations
```

Apply to a specific revision:

```bash
alembic upgrade ae1027a6acf  # Apply up to this revision ID
```

### Rolling Back Migrations

Revert the last applied migration:

```bash
alembic downgrade -1
```

Revert to a specific revision:

```bash
alembic downgrade ae1027a6acf
```

Revert all migrations:

```bash
alembic downgrade base
```

### Viewing Migration History

List all revisions and their status:

```bash
alembic history  # Show all revisions
alembic current  # Show current (applied) revision
```

## Migration File Structure

Each migration file follows this pattern:

```python
"""Migration description.

Revision ID: <hash>
Revises: <parent-hash>
Create Date: <timestamp>

"""

def upgrade() -> None:
    """Upgrade schema."""
    # SQL operations to apply

def downgrade() -> None:
    """Downgrade schema."""
    # SQL operations to revert
```

### Best Practices

1. **Descriptive names**: Use clear, concise descriptions in the migration message
   - Good: `Add user table with email unique constraint`
   - Bad: `Update schema`

2. **Reversible migrations**: Always implement both `upgrade()` and `downgrade()`
   - Ensures you can rollback in production if needed

3. **Atomic changes**: Keep migrations focused on a single logical change
   - One table per migration when possible
   - Related changes (indexes, constraints) in the same migration

4. **Test migrations**: Always test in development before deploying to production
   ```bash
   # Test upgrade path
   alembic upgrade head

   # Test downgrade path
   alembic downgrade -1
   alembic upgrade head  # Verify upgrade works again
   ```

5. **Data migrations**: Use `bulk_insert_mappings()` for data transformations
   ```python
   def upgrade():
       connection = op.get_bind()
       # Read old data
       result = connection.execute(text("SELECT id, old_field FROM table"))
       # Transform and insert
       for row in result:
           # Process data
   ```

## Integration with ORM Models

When you create/modify ORM models in `src/models/`, the migration workflow is:

1. **Define the ORM model** in `src/models/*.py`
   ```python
   class User(Base):
       __tablename__ = "users"
       id: Mapped[int] = mapped_column(primary_key=True)
       email: Mapped[str] = mapped_column(String(255), unique=True)
   ```

2. **Generate migration** from the model
   ```bash
   alembic revision --autogenerate -m "Add users table"
   ```

3. **Review and edit** the generated migration if needed
   ```bash
   vim src/db/migrations/versions/abc123_add_users_table.py
   ```

4. **Apply migration** to your database
   ```bash
   alembic upgrade head
   ```

## CI/CD Integration

### GitHub Actions / Deployment

In production, run migrations as part of your deployment:

```yaml
# Example: Deploy script
./backend/editor-api/.venv/bin/alembic upgrade head

# Then start the application
python -m uvicorn src.main:app
```

### Pre-deployment Validation

Validate migrations before deployment:

```bash
# Check if migrations are up to date
alembic current
alembic history

# Dry-run migrations (offline mode)
alembic upgrade head --sql
```

## Troubleshooting

### Migration fails with "target metadata not found"

**Cause**: ORM models not yet created or import path is wrong

**Solution**:
- Ensure `src/models/file.py` (or your Base module) exists and defines `Base`
- Check the import in `env.py` matches your actual model location

### "No changes detected" when running autogenerate

**Causes**:
- Models match current database schema (no changes needed)
- ORM models not properly imported in `env.py`
- Database not yet initialized (run `init_db()` first)

**Solution**:
- Verify your model changes are saved
- Check that `target_metadata` in `env.py` references the correct `Base`
- Ensure database exists and is reachable

### Connection refused or authentication failed

**Cause**: Invalid `DATABASE_URL` or PostgreSQL not running

**Solution**:
```bash
# Verify DATABASE_URL is set correctly
echo $DATABASE_URL

# Ensure PostgreSQL is running
psql -U user -d api_architect_editor -h localhost
```

### Migration hangs or times out

**Cause**: Long-running migration or network issue

**Solution**:
- Add timeout/cancellation token in migration code
- Test on smaller dataset
- Check PostgreSQL logs for slow queries
- Increase `POOL_TIMEOUT` in `.env` if connection pooling timeout occurs

## Performance Considerations

### Large Table Migrations

For tables with millions of rows:

1. **Use indexes carefully**
   - Drop indexes before bulk operations, recreate after
   - Use `concurrent=True` for safe concurrent operations (PostgreSQL 9.2+)

2. **Batch data modifications**
   ```python
   # Instead of updating all rows at once
   connection.execute(text(
       "UPDATE large_table SET field = :value WHERE id < 10000"
   ))
   ```

3. **Lock timeout**
   Set appropriate lock timeouts in PostgreSQL:
   ```python
   connection.execute(text("SET lock_timeout = '10s'"))
   ```

## Examples

### Adding a New Table

```bash
# 1. Define ORM model in src/models/document.py
class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

# 2. Generate migration
alembic revision --autogenerate -m "Add documents table"

# 3. Apply migration
alembic upgrade head
```

### Adding a Column with Default

```python
# Migration file: add_column_migration.py
def upgrade():
    op.add_column('users', sa.Column('status', sa.String(50), server_default='active'))

def downgrade():
    op.drop_column('users', 'status')
```

### Creating an Index

```python
def upgrade():
    op.create_index('idx_users_email', 'users', ['email'], unique=True)

def downgrade():
    op.drop_index('idx_users_email')
```

## References

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy ORM Documentation](https://docs.sqlalchemy.org/en/20/)
- [PostgreSQL Migration Best Practices](https://wiki.postgresql.org/wiki/Migrations)
