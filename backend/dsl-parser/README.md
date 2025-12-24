# DSL Parser

Recursive descent parser for the Requirements Grammar DSL.

## Features

- Hand-written lexer/tokenizer for markdown-based DSL
- Recursive descent parser for Service, Model, Operation, Error definitions
- AST (Abstract Syntax Tree) with source location tracking
- Error reporting with line/column and suggested fixes
- Best-effort parsing: extracts valid entities even with syntax errors

## Usage

```python
from src.parser import parse

source = """
# Service: Petstore API
version: 1.0.0

## Model: Pet
| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |

## Operation: GET /pets
List all pets.
**Response**: Pet[]
"""

result = parse(source)
print(f"Services: {len(result.services)}")
print(f"Models: {len(result.models)}")
print(f"Operations: {len(result.operations)}")
print(f"Errors: {len(result.parse_errors)}")
```

## DSL Syntax

See `specs/002-requirements-grammar/dsl-grammar.md` for full syntax documentation.
