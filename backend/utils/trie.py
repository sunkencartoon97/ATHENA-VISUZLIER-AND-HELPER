"""
backend/utils/trie.py
======================
Prefix Trie for ATHENA algorithm-name autocomplete.

Provides:
  - O(k) exact_match  â€” where k = len(word)
  - O(k + m) search   â€” prefix search returning all m matching words
  - Case-insensitive by default (words stored in lowercase, queries normalised)

Designed for the small, static set of KNOWN_ALGOS (â‰¤ ~30 entries), so
memory footprint and build time are negligible.
"""

from __future__ import annotations

from typing import List, Optional


class TrieNode:
    """Single node in the Trie."""

    __slots__ = ("children", "is_end", "word")

    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.is_end: bool = False
        self.word: Optional[str] = None  # original (un-lowercased) word


class Trie:
    """Prefix tree supporting autocomplete and exact-match queries.

    Example
    -------
    >>> t = Trie()
    >>> t.insert("quicksort")
    >>> t.insert("mergesort")
    >>> t.search("sort")          # prefix search
    ['mergesort', 'quicksort']
    >>> t.exact_match("quicksort")
    True
    >>> t.exact_match("quick")
    False
    """

    def __init__(self) -> None:
        self.root = TrieNode()

    # â”€â”€ Mutation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def insert(self, word: str) -> None:
        """Insert *word* into the trie.

        The word is stored in lowercase internally; the original case is
        preserved in `TrieNode.word` for retrieval.

        Parameters
        ----------
        word : Algorithm name to insert (e.g. 'quicksort').
        """
        node = self.root
        for char in word.lower():
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True
        node.word = word  # preserve original casing

    def insert_many(self, words: List[str]) -> None:
        """Convenience bulk-insert."""
        for word in words:
            self.insert(word)

    # â”€â”€ Query â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def exact_match(self, word: str) -> bool:
        """Return True iff *word* was inserted exactly.

        Case-insensitive: 'QuickSort' matches an inserted 'quicksort'.
        """
        node = self.root
        for char in word.lower():
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end

    def search(self, prefix: str) -> List[str]:
        """Return all inserted words whose lowercase form starts with *prefix*.

        Parameters
        ----------
        prefix : Query prefix (case-insensitive).

        Returns
        -------
        Sorted list of matching words (original casing preserved).
        Empty list when no words match.
        """
        node = self.root
        for char in prefix.lower():
            if char not in node.children:
                return []
            node = node.children[char]

        results: List[str] = []
        self._collect(node, results)
        return sorted(results)

    def starts_with(self, prefix: str) -> bool:
        """Return True iff any inserted word starts with *prefix*."""
        node = self.root
        for char in prefix.lower():
            if char not in node.children:
                return False
            node = node.children[char]
        return True

    # â”€â”€ Internal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def _collect(self, node: TrieNode, results: List[str]) -> None:
        """DFS from *node*, appending every terminal word to *results*."""
        if node.is_end and node.word is not None:
            results.append(node.word)
        for child in node.children.values():
            self._collect(child, results)
