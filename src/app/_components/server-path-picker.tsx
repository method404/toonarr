"use client";

import { useState } from "react";
import type { Locale } from "@/lib/locale";

type DirectoryPayload = {
  currentPath: string;
  parentPath: string | null;
  roots: string[];
  directories: Array<{
    name: string;
    path: string;
  }>;
};

type ServerPathPickerProps = {
  value: string;
  locale: Locale;
  prompt: string;
  chooseLabel: string;
  choosingLabel: string;
  useCurrentLabel: string;
  closeLabel: string;
  onChange: (value: string) => void;
  resetLabel?: string;
  resetValue?: string;
  className?: string;
  showChooseButton?: boolean;
};

export function ServerPathPicker({
  value,
  locale,
  prompt,
  chooseLabel,
  choosingLabel,
  useCurrentLabel,
  closeLabel,
  onChange,
  resetLabel,
  resetValue,
  className = "",
  showChooseButton = true,
}: ServerPathPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<DirectoryPayload | null>(null);

  const labels = {
    roots: locale === "ko" ? "루트" : "Roots",
    parent: locale === "ko" ? "상위 폴더" : "Up",
    empty:
      locale === "ko"
        ? "하위 폴더가 없습니다."
        : "There are no subdirectories.",
  };

  const loadDirectory = async (targetPath: string) => {
    setIsLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({ path: targetPath });
      const response = await fetch(`/api/system/directories?${query.toString()}`, {
        cache: "no-store",
      });
      const nextPayload = (await response.json()) as
        | ({ error?: string } & Partial<DirectoryPayload>)
        | null;

      if (!response.ok || !nextPayload?.currentPath || !nextPayload.roots) {
        throw new Error(nextPayload?.error || "Failed to load directories.");
      }

      setPayload({
        currentPath: nextPayload.currentPath,
        parentPath: nextPayload.parentPath ?? null,
        roots: nextPayload.roots,
        directories: nextPayload.directories ?? [],
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load directories.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`path-picker-row ${className}`.trim()}>
        <button
          type="button"
          className="path-picker-input"
          onClick={() => {
            setIsOpen(true);
            void loadDirectory(value);
          }}
        >
          <span>{value}</span>
        </button>
        {resetLabel && resetValue ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => onChange(resetValue)}
          >
            {resetLabel}
          </button>
        ) : null}
        {showChooseButton ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setIsOpen(true);
              void loadDirectory(value);
            }}
          >
            {chooseLabel}
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="path-browser-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="path-browser-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="path-browser-header">
              <div>
                <h2>{prompt}</h2>
                <p>{payload?.currentPath || value}</p>
              </div>
              <button
                type="button"
                className="path-browser-close"
                onClick={() => setIsOpen(false)}
                aria-label={closeLabel}
              >
                ×
              </button>
            </div>

            <div className="path-browser-toolbar">
              <span className="path-browser-toolbar-label">{labels.roots}</span>
              <div className="path-browser-root-list">
                {(payload?.roots ?? []).map((root) => (
                  <button
                    key={root}
                    type="button"
                    className={`path-browser-root${
                      payload?.currentPath === root ? " active" : ""
                    }`}
                    onClick={() => void loadDirectory(root)}
                  >
                    {root}
                  </button>
                ))}
              </div>
            </div>

            <div className="path-browser-actions">
              <button
                type="button"
                className="button secondary"
                disabled={!payload?.parentPath || isLoading}
                onClick={() =>
                  payload?.parentPath ? void loadDirectory(payload.parentPath) : undefined
                }
              >
                {labels.parent}
              </button>
              <button
                type="button"
                className="button button-success"
                disabled={!payload?.currentPath}
                onClick={() => {
                  if (payload?.currentPath) {
                    onChange(payload.currentPath);
                  }
                  setIsOpen(false);
                }}
              >
                {useCurrentLabel}
              </button>
            </div>

            <div className="path-browser-list">
              {isLoading ? (
                <div className="path-browser-empty">{choosingLabel}</div>
              ) : error ? (
                <div className="path-browser-empty error">{error}</div>
              ) : payload?.directories.length ? (
                payload.directories.map((directory) => (
                  <button
                    key={directory.path}
                    type="button"
                    className="path-browser-item"
                    onClick={() => void loadDirectory(directory.path)}
                  >
                    <span className="path-browser-item-name">{directory.name}</span>
                    <span className="path-browser-item-path">{directory.path}</span>
                  </button>
                ))
              ) : (
                <div className="path-browser-empty">{labels.empty}</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
