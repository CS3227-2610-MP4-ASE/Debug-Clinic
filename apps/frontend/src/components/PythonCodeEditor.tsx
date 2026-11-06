import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import {
  Annotation,
  Compartment,
  EditorState,
  Transaction,
} from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { indentOnInput, indentUnit } from "@codemirror/language";

const externalUpdate = Annotation.define<boolean>();
const SOURCE_LIMIT = 20_000;
const editability = new Compartment();

export function PythonCodeEditor({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        indentOnInput(),
        indentUnit.of("    "),
        EditorState.changeFilter.of(
          (transaction) =>
            !transaction.docChanged ||
            transaction.newDoc.length <= SOURCE_LIMIT,
        ),
        editability.of([
          EditorState.readOnly.of(disabledRef.current),
          EditorView.editable.of(!disabledRef.current),
        ]),
        EditorView.contentAttributes.of({
          "aria-label": "Your Python 3 code",
          spellcheck: "false",
          autocapitalize: "off",
          autocomplete: "off",
          autocorrect: "off",
        }),
        EditorView.updateListener.of((update) => {
          if (
            update.docChanged &&
            !update.transactions.some((tr) => tr.annotation(externalUpdate))
          ) {
            callback.current(update.state.doc.toString());
          }
        }),
        EditorView.theme(
          {
            "&": {
              height: "100%",
              color: "#171b25",
              backgroundColor: "#fff",
              fontSize: "0.9rem",
            },
            ".cm-scroller": {
              overflow: "auto",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            },
            ".cm-gutters": {
              backgroundColor: "#f5f3ed",
              color: "#565f70",
              borderRight: "1px solid #d9d7d0",
            },
            ".cm-content": { padding: "12px 0", caretColor: "#2457c5" },
            ".cm-line": { padding: "0 12px" },
            ".cm-activeLineGutter": { backgroundColor: "#e9edf6" },
            "&.cm-focused": {
              outline: "2px solid #17213a",
              outlineOffset: "2px",
            },
            "&.cm-focused .cm-selectionBackground, ::selection": {
              backgroundColor: "#dbe6ff",
            },
          },
          { dark: false },
        ),
      ],
    });
    const instance = new EditorView({ state, parent: host.current });
    view.current = instance;
    return () => {
      instance.destroy();
      view.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = view.current;
    if (!instance || instance.state.doc.toString() === value) return;
    instance.dispatch({
      changes: { from: 0, to: instance.state.doc.length, insert: value },
      annotations: [
        externalUpdate.of(true),
        Transaction.addToHistory.of(false),
      ],
    });
  }, [value]);

  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    instance.dispatch({
      effects: editability.reconfigure([
        EditorState.readOnly.of(disabled),
        EditorView.editable.of(!disabled),
      ]),
    });
    instance.contentDOM.setAttribute("aria-disabled", String(disabled));
    instance.dom.toggleAttribute("data-disabled", disabled);
  }, [disabled]);

  return (
    <div
      ref={host}
      data-testid="python-editor"
      style={{
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        border: "1px solid #d9d7d0",
        borderRadius: 8,
      }}
    />
  );
}
