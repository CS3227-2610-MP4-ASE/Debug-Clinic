import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("experiment", Path(__file__).with_name("experiment.py"))
experiment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(experiment)


class PreparationTests(unittest.TestCase):
    def setUp(self):
        scratch = Path(__file__).resolve().parents[3] / ".workflow-state"
        scratch.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "docs").mkdir()
        (self.root / "docs" / "source.md").write_bytes("α\nsecond\nthird\n".encode())

    def test_full_receipt_and_utf8_bytes(self):
        text, receipt = experiment.source_receipt(self.root, "docs/source.md")
        self.assertEqual(receipt["emitted_utf8_bytes"], len(text.encode()))
        self.assertEqual(receipt["file_sha256"], experiment.digest((self.root / "docs/source.md").read_bytes()))

    def test_exact_range_and_hash(self):
        text, receipt = experiment.source_receipt(self.root, "docs/source.md", 2, 2)
        self.assertEqual(text, "second\n")
        self.assertEqual(receipt["excerpt_sha256"], experiment.digest(b"second\n"))

    def test_invalid_ranges_are_not_truncated(self):
        for bounds in [(0, 1), (3, 2), (1, 50)]:
            with self.subTest(bounds=bounds), self.assertRaises(ValueError):
                experiment.source_receipt(self.root, "docs/source.md", *bounds)

    def test_traversal_and_absolute_reads_fail(self):
        for name in ["../outside.md", str((self.root / "docs/source.md").resolve())]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                experiment.source_receipt(self.root, name)

    def test_credentials_and_git_are_excluded(self):
        for name in [".env", ".git/config", ".codex/config.toml"]:
            p = self.root / name
            p.parent.mkdir(exist_ok=True)
            p.write_text("SENTINEL", encoding="utf-8")
            with self.subTest(name=name), self.assertRaises(ValueError):
                experiment.source_receipt(self.root, name)

    def test_metadata_journal_omits_content(self):
        text, receipt = experiment.source_receipt(self.root, "docs/source.md")
        experiment.append(self.root / "private", "builder", {"kind": "retrieve", **receipt})
        data=(self.root / "private/context-builder.jsonl").read_text(encoding="utf-8")
        self.assertNotIn("second", data)
        self.assertNotIn(str(self.root), data)

    def test_lock_collision_preserves_first_writer(self):
        with experiment.locked(self.root):
            with self.assertRaises(FileExistsError):
                with experiment.locked(self.root):
                    self.fail("second writer entered")
        self.assertFalse((self.root / ".receipt.lock").exists())

    def test_database_target_validation(self):
        self.assertTrue(experiment.database_url("postgresql://test:test@127.0.0.1:5439/f01_test"))
        for value in ["postgresql://x@remote:5432/f01_test", "postgresql://x@127.0.0.1:5432/production", "postgresql://x@127.0.0.1/f01_test", "postgresql://x@127.0.0.1:5432/f01_test?x=1"]:
            with self.subTest(value=value), self.assertRaises(ValueError): experiment.database_url(value)

    def config(self):
        return {"database_url":"postgresql://test:test@127.0.0.1:5439/f01_test", "node":"C:/node24/node.exe", "npm_cli":"C:/node24/npm-cli.js"}

    def test_environment_excludes_live_provider_credentials(self):
        with patch.dict(os.environ, {"SOC_LLM_API_KEY":"SENTINEL", "SMTP_PASSWORD":"SENTINEL", "DATABASE_URL":"postgresql://production"}):
            env=experiment.environment(self.config())
        self.assertEqual(env["AI_PROVIDER"], "fake")
        self.assertNotIn("SENTINEL", str(env))
        self.assertEqual(env["DATABASE_URL"], self.config()["database_url"])

    def test_npm_uses_pinned_node_without_shell_concatenation(self):
        self.assertEqual(experiment.command(self.config(), ["npm","run","typecheck"]), ["C:/node24/node.exe","C:/node24/npm-cli.js","run","typecheck"])
        with self.assertRaises(ValueError): experiment.command(self.config(), ["cmd","/c","anything"])


if __name__ == "__main__":
    unittest.main()
