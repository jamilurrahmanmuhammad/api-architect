"""
DSL Parser for Requirements Grammar Authoring Studio.

This package provides a hand-written recursive descent parser for
the markdown-based DSL used to define API requirements.

Modules:
    dsl_ast: Abstract Syntax Tree node classes
    errors: Error reporting with line/column tracking
    lexer: Tokenizer for DSL syntax
    parser: Recursive descent parser
    validator: Semantic validation rules
"""

from .dsl_ast import (
    ASTNode,
    ServiceNode,
    ModelNode,
    FieldNode,
    OperationNode,
    ErrorNode,
    ParsedRequirements,
)
from .errors import ParseError, ParseErrorType
from .lexer import Lexer, Token, TokenType
from .parser import Parser

__all__ = [
    # AST
    "ASTNode",
    "ServiceNode",
    "ModelNode",
    "FieldNode",
    "OperationNode",
    "ErrorNode",
    "ParsedRequirements",
    # Errors
    "ParseError",
    "ParseErrorType",
    # Lexer
    "Lexer",
    "Token",
    "TokenType",
    # Parser
    "Parser",
]

__version__ = "0.1.0"
