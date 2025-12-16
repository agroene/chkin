"use client";

/**
 * Section Organizer Component
 *
 * Organize form fields into sections with drag-and-drop support.
 */

import { useState } from "react";

interface FormField {
  id: string;
  fieldDefinitionId: string;
  fieldDefinition: {
    id: string;
    name: string;
    label: string;
    description: string | null;
    fieldType: string;
    config: string | null;
    category: string;
  };
  labelOverride: string | null;
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  section: string | null;
  columnSpan: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // Column span out of 8 (8 = full width)
}

interface SectionOrganizerProps {
  sections: string[];
  fields: FormField[];
  activeSection: string;
  onSetActiveSection: (section: string) => void;
  onAddSection: (name: string) => void;
  onRemoveSection: (name: string) => void;
  onUpdateField: (fieldId: string, updates: Partial<FormField>) => void;
  onRemoveField: (fieldId: string) => void;
  onReorderFields: (fields: FormField[]) => void;
}

export default function SectionOrganizer({
  sections,
  fields,
  activeSection,
  onSetActiveSection,
  onAddSection,
  onRemoveSection,
  onUpdateField,
  onRemoveField,
  onReorderFields,
}: SectionOrganizerProps) {
  const [newSectionName, setNewSectionName] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);

  // Group fields by section
  const fieldsBySection = sections.reduce((acc, section) => {
    acc[section] = fields
      .filter((f) => f.section === section)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return acc;
  }, {} as Record<string, FormField[]>);

  // Add new section
  const handleAddSection = () => {
    if (newSectionName.trim() && !sections.includes(newSectionName.trim())) {
      onAddSection(newSectionName.trim());
      setNewSectionName("");
    }
  };

  // Handle drag start
  const handleDragStart = (fieldId: string) => {
    setDraggedField(fieldId);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle drop on section
  const handleDropOnSection = (section: string) => {
    if (draggedField) {
      onUpdateField(draggedField, { section });
      setDraggedField(null);
    }
  };

  // Handle drop to reorder
  const handleDropOnField = (targetFieldId: string, targetSection: string) => {
    if (draggedField && draggedField !== targetFieldId) {
      const draggedFieldData = fields.find((f) => f.id === draggedField);
      const targetFieldData = fields.find((f) => f.id === targetFieldId);

      if (draggedFieldData && targetFieldData) {
        // Update section if different
        const updatedFields = fields.map((f) => {
          if (f.id === draggedField) {
            return { ...f, section: targetSection };
          }
          return f;
        });

        // Reorder fields
        const sectionFields = updatedFields
          .filter((f) => f.section === targetSection)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const draggedIdx = sectionFields.findIndex((f) => f.id === draggedField);
        const targetIdx = sectionFields.findIndex((f) => f.id === targetFieldId);

        if (draggedIdx !== -1 && targetIdx !== -1) {
          // Remove dragged field
          sectionFields.splice(draggedIdx, 1);
          // Insert at target position
          const insertIdx = draggedIdx < targetIdx ? targetIdx : targetIdx;
          sectionFields.splice(insertIdx, 0, updatedFields.find((f) => f.id === draggedField)!);

          // Update sort orders
          const reorderedFields = sectionFields.map((f, i) => ({
            ...f,
            sortOrder: i,
          }));

          // Merge with other sections
          const otherFields = updatedFields.filter((f) => f.section !== targetSection);
          onReorderFields([...otherFields, ...reorderedFields]);
        }
      }
      setDraggedField(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Section */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="New section name..."
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          onClick={handleAddSection}
          disabled={!newSectionName.trim()}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Section
        </button>
      </div>

      {/* Sections */}
      {sections.map((section) => {
        const isActive = activeSection === section;
        return (
        <div
          key={section}
          className={`rounded-lg border-2 bg-white transition-colors ${
            isActive ? "border-teal-500 ring-1 ring-teal-500" : "border-gray-200"
          }`}
          onDragOver={handleDragOver}
          onDrop={() => handleDropOnSection(section)}
        >
          {/* Section Header - Clickable to set as target */}
          <button
            type="button"
            onClick={() => onSetActiveSection(section)}
            className={`flex w-full items-center justify-between border-b px-4 py-3 text-left transition-colors ${
              isActive
                ? "border-teal-200 bg-teal-50"
                : "border-gray-200 bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {isActive && (
                <span className="flex h-2 w-2 rounded-full bg-teal-500" title="New fields will be added here">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-teal-400 opacity-75"></span>
                </span>
              )}
              <h3 className={`font-medium ${isActive ? "text-teal-900" : "text-gray-900"}`}>
                {section}
              </h3>
              {isActive && (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                  Adding here
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {sections.length > 1 && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSection(section);
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Remove section"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </span>
              )}
            </div>
          </button>

          {/* Fields */}
          <div className="min-h-[60px] p-4">
            {fieldsBySection[section]?.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                Drag fields here or add from the field picker below
              </p>
            ) : (
              <div className="space-y-2">
                {fieldsBySection[section]?.map((field) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleDragStart(field.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDropOnField(field.id, section);
                    }}
                    className={`rounded-lg border bg-white p-3 transition-all ${
                      draggedField === field.id
                        ? "border-teal-400 opacity-50"
                        : "border-gray-200 hover:border-gray-300"
                    } ${editingField === field.id ? "ring-2 ring-teal-500" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Drag Handle */}
                      <div className="mt-1 cursor-grab text-gray-400 hover:text-gray-600">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8h16M4 16h16"
                          />
                        </svg>
                      </div>

                      {/* Field Content */}
                      <div className="min-w-0 flex-1">
                        {editingField === field.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-500">
                                Label Override
                              </label>
                              <input
                                type="text"
                                value={field.labelOverride || ""}
                                onChange={(e) =>
                                  onUpdateField(field.id, {
                                    labelOverride: e.target.value || null,
                                  })
                                }
                                placeholder={field.fieldDefinition.label}
                                className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">
                                Help Text
                              </label>
                              <input
                                type="text"
                                value={field.helpText || ""}
                                onChange={(e) =>
                                  onUpdateField(field.id, {
                                    helpText: e.target.value || null,
                                  })
                                }
                                placeholder="Additional instructions..."
                                className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">
                                Column Width (out of 8)
                              </label>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                      onUpdateField(field.id, {
                                        columnSpan: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
                                      })
                                    }
                                    title={value === 8 ? "Full width" : `${value}/8 width`}
                                    className={`min-w-[32px] rounded border px-2 py-1 text-xs font-medium transition-colors ${
                                      field.columnSpan === value
                                        ? "border-teal-500 bg-teal-50 text-teal-700"
                                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    }`}
                                  >
                                    {value === 8 ? "Full" : value}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => setEditingField(null)}
                              className="text-xs text-teal-600 hover:text-teal-700"
                            >
                              Done editing
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {field.labelOverride || field.fieldDefinition.label}
                              </span>
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                                {field.fieldDefinition.fieldType}
                              </span>
                              {field.columnSpan !== 8 && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600">
                                  {field.columnSpan}/8
                                </span>
                              )}
                            </div>
                            {field.helpText && (
                              <p className="mt-0.5 text-xs text-gray-500">
                                {field.helpText}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Required Toggle */}
                        <label className="flex cursor-pointer items-center gap-1">
                          <input
                            type="checkbox"
                            checked={field.isRequired}
                            onChange={(e) =>
                              onUpdateField(field.id, {
                                isRequired: e.target.checked,
                              })
                            }
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-xs text-gray-500">Required</span>
                        </label>

                        {/* Edit */}
                        <button
                          onClick={() =>
                            setEditingField(
                              editingField === field.id ? null : field.id
                            )
                          }
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit field"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        {/* Remove */}
                        <button
                          onClick={() => onRemoveField(field.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Remove field"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        );
      })}

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            No fields added yet. Use the field picker below to add fields.
          </p>
        </div>
      )}
    </div>
  );
}
