'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  FolderTree,
  CheckCircle2,
  Plus,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClassItem, BoardItem, UnitItem, TopicItem, SubTopicItem, ContentScope } from '@/types';
import { TeacherService } from '@/lib/teacher-service';

export interface AcademicSelectionValue {
  classId: string;
  className?: string;
  boardId: string;
  boardName?: string;
  subjectName: string;
  unitId: string | null;
  unitTitle?: string;
  topicId: string | null;
  topicTitle?: string;
  subTopicId: string | null;
  subTopicTitle?: string;
  scope: ContentScope;
}

interface Props {
  channelClasses: ClassItem[];
  channelBoards: BoardItem[];
  channelSubjects: string[];
  value: Partial<AcademicSelectionValue>;
  onChange: (val: AcademicSelectionValue) => void;
}

export function AcademicCurriculumSelector({
  channelClasses,
  channelBoards,
  channelSubjects,
  value,
  onChange,
}: Props) {
  // Step selections
  const [selectedClassId, setSelectedClassId] = useState<string>(value.classId || channelClasses[0]?.id || '');
  const [selectedBoardId, setSelectedBoardId] = useState<string>(value.boardId || channelBoards[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState<string>(value.subjectName || channelSubjects[0] || 'Physics');
  
  // Units & Tree
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Selection
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(value.unitId || null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(value.topicId || null);
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | null>(value.subTopicId || null);
  const [selectedScope, setSelectedScope] = useState<ContentScope>(value.scope || 'unit');

  // Custom unit/topic addition
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [addingTopicToUnitId, setAddingTopicToUnitId] = useState<string | null>(null);

  // Load Curriculum tree whenever Class, Board, or Subject changes
  useEffect(() => {
    let isMounted = true;
    async function loadTree() {
      if (!selectedClassId || !selectedBoardId || !selectedSubject) return;
      setLoadingUnits(true);
      try {
        const loadedUnits = await TeacherService.getCurriculum(selectedClassId, selectedBoardId, selectedSubject);
        if (isMounted) {
          setUnits(loadedUnits);
          // Auto-expand first unit
          if (loadedUnits.length > 0) {
            setExpandedUnits(prev => ({ ...prev, [loadedUnits[0].id]: true }));
          }
        }
      } catch (err) {
        console.error('Error loading curriculum tree', err);
      } finally {
        if (isMounted) setLoadingUnits(false);
      }
    }

    loadTree();
    return () => {
      isMounted = false;
    };
  }, [selectedClassId, selectedBoardId, selectedSubject]);

  // Propagate changes upwards
  const emitChange = (updates: {
    classId?: string;
    boardId?: string;
    subjectName?: string;
    unitId?: string | null;
    topicId?: string | null;
    subTopicId?: string | null;
    scope?: ContentScope;
  }) => {
    const classId = updates.classId !== undefined ? updates.classId : selectedClassId;
    const boardId = updates.boardId !== undefined ? updates.boardId : selectedBoardId;
    const subjectName = updates.subjectName !== undefined ? updates.subjectName : selectedSubject;
    const unitId = updates.unitId !== undefined ? updates.unitId : selectedUnitId;
    const topicId = updates.topicId !== undefined ? updates.topicId : selectedTopicId;
    const subTopicId = updates.subTopicId !== undefined ? updates.subTopicId : selectedSubTopicId;
    const scope = updates.scope !== undefined ? updates.scope : selectedScope;

    const currentClass = channelClasses.find(c => c.id === classId);
    const currentBoard = channelBoards.find(b => b.id === boardId);
    const currentUnit = units.find(u => u.id === unitId);
    const currentTopic = currentUnit?.topics?.find(t => t.id === topicId);
    const currentSubTopic = currentTopic?.sub_topics?.find(st => st.id === subTopicId);

    onChange({
      classId,
      className: currentClass?.name,
      boardId,
      boardName: currentBoard?.name,
      subjectName,
      unitId,
      unitTitle: currentUnit?.title,
      topicId,
      topicTitle: currentTopic?.title,
      subTopicId,
      subTopicTitle: currentSubTopic?.title,
      scope,
    });
  };

  // Unit selection (Full Unit scope)
  const handleSelectUnit = (unit: UnitItem) => {
    setSelectedUnitId(unit.id);
    setSelectedTopicId(null);
    setSelectedSubTopicId(null);
    setSelectedScope('unit');
    emitChange({
      unitId: unit.id,
      topicId: null,
      subTopicId: null,
      scope: 'unit',
    });
  };

  // Topic selection (Topic scope)
  const handleSelectTopic = (unit: UnitItem, topic: TopicItem) => {
    setSelectedUnitId(unit.id);
    setSelectedTopicId(topic.id);
    setSelectedSubTopicId(null);
    setSelectedScope('topic');
    emitChange({
      unitId: unit.id,
      topicId: topic.id,
      subTopicId: null,
      scope: 'topic',
    });
  };

  // Sub-topic selection (Sub-topic scope)
  const handleSelectSubTopic = (unit: UnitItem, topic: TopicItem, subTopic: SubTopicItem) => {
    setSelectedUnitId(unit.id);
    setSelectedTopicId(topic.id);
    setSelectedSubTopicId(subTopic.id);
    setSelectedScope('sub_topic');
    emitChange({
      unitId: unit.id,
      topicId: topic.id,
      subTopicId: subTopic.id,
      scope: 'sub_topic',
    });
  };

  const toggleExpandUnit = (id: string) => {
    setExpandedUnits(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandTopic = (id: string) => {
    setExpandedTopics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Add Custom Unit
  const handleAddUnit = () => {
    if (!newUnitTitle.trim()) return;
    const newUnit: UnitItem = {
      id: `u-custom-${Date.now()}`,
      class_id: selectedClassId,
      board_id: selectedBoardId,
      subject_name: selectedSubject,
      unit_number: units.length + 1,
      title: newUnitTitle.trim(),
      description: null,
      display_order: units.length + 1,
      topics: [],
    };
    const updated = [...units, newUnit];
    setUnits(updated);
    setNewUnitTitle('');
    setShowAddUnit(false);
    handleSelectUnit(newUnit);
  };

  // Add Custom Topic
  const handleAddTopic = (unitId: string) => {
    if (!newTopicTitle.trim()) return;
    const newTopic: TopicItem = {
      id: `t-custom-${Date.now()}`,
      unit_id: unitId,
      title: newTopicTitle.trim(),
      description: null,
      display_order: 99,
      is_active: true,
      sub_topics: [],
    };

    const updated = units.map(u => {
      if (u.id === unitId) {
        return { ...u, topics: [...(u.topics || []), newTopic] };
      }
      return u;
    });

    setUnits(updated);
    setNewTopicTitle('');
    setAddingTopicToUnitId(null);
    const parentUnit = units.find(u => u.id === unitId);
    if (parentUnit) {
      handleSelectTopic(parentUnit, newTopic);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Academic Selectors Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
        {/* Class */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            Class
          </Label>
          <select
            value={selectedClassId}
            onChange={e => {
              setSelectedClassId(e.target.value);
              emitChange({ classId: e.target.value });
            }}
            className="w-full h-10 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {channelClasses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Board */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Board
          </Label>
          <select
            value={selectedBoardId}
            onChange={e => {
              setSelectedBoardId(e.target.value);
              emitChange({ boardId: e.target.value });
            }}
            className="w-full h-10 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {channelBoards.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            Subject
          </Label>
          <select
            value={selectedSubject}
            onChange={e => {
              setSelectedSubject(e.target.value);
              emitChange({ subjectName: e.target.value });
            }}
            className="w-full h-10 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {channelSubjects.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Scope & Selection Highlight Banner */}
      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            Selected Scope:
          </span>
          <Badge
            className={`font-semibold rounded-lg ${
              selectedScope === 'unit'
                ? 'bg-blue-600 text-white'
                : selectedScope === 'topic'
                ? 'bg-emerald-600 text-white'
                : 'bg-purple-600 text-white'
            }`}
          >
            {selectedScope === 'unit'
              ? 'Entire Unit'
              : selectedScope === 'topic'
              ? 'Specific Topic'
              : 'Sub-topic'}
          </Badge>
          <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-xs">
            {selectedScope === 'unit' && units.find(u => u.id === selectedUnitId)?.title}
            {selectedScope === 'topic' &&
              units
                .flatMap(u => u.topics || [])
                .find(t => t.id === selectedTopicId)?.title}
            {selectedScope === 'sub_topic' &&
              units
                .flatMap(u => u.topics || [])
                .flatMap(t => t.sub_topics || [])
                .find(st => st.id === selectedSubTopicId)?.title}
          </span>
        </div>
        <span className="text-neutral-500">
          Click any unit, topic, or sub-topic below to set scope.
        </span>
      </div>

      {/* 3. Expandable Mind-Map / Curriculum Tree */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-emerald-600" />
            Curriculum Structure ({selectedSubject})
          </Label>
          <button
            type="button"
            onClick={() => setShowAddUnit(true)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Unit
          </button>
        </div>

        {/* Add Unit Input Modal/Inline */}
        {showAddUnit && (
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center gap-2">
            <Input
              placeholder="e.g. Unit 5: Modern Physics & Semiconductors"
              value={newUnitTitle}
              onChange={e => setNewUnitTitle(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddUnit}
              className="h-9 bg-emerald-600 text-white rounded-lg px-3 text-xs"
            >
              Add Unit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddUnit(false)}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
          </div>
        )}

        {loadingUnits ? (
          <div className="py-8 text-center text-xs text-neutral-400 animate-pulse">
            Loading curriculum tree...
          </div>
        ) : units.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 text-xs">
            No curriculum units found. Click &quot;Add Custom Unit&quot; above to create your first unit.
          </div>
        ) : (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {units.map((unit, uIdx) => {
              const isUnitSelected = selectedUnitId === unit.id && selectedScope === 'unit';
              const isExpanded = Boolean(expandedUnits[unit.id]);
              const topics = unit.topics || [];

              return (
                <div
                  key={unit.id}
                  className={`rounded-2xl border transition-all ${
                    isUnitSelected
                      ? 'border-blue-500 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                  }`}
                >
                  {/* Unit Row */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleExpandUnit(unit.id)}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div className="truncate">
                        <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 font-heading">
                          Unit {unit.unit_number || uIdx + 1}: {unit.title}
                        </span>
                        {unit.description && (
                          <p className="text-[11px] text-neutral-500 truncate">{unit.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={isUnitSelected ? 'primary' : 'outline'}
                        onClick={() => handleSelectUnit(unit)}
                        className={`text-xs h-8 px-3 rounded-lg font-semibold ${
                          isUnitSelected
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'border-neutral-300 dark:border-neutral-700'
                        }`}
                      >
                        {isUnitSelected ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Entire Unit Selected
                          </>
                        ) : (
                          'Select Entire Unit'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Topics List (Expanded) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2.5 ml-6 pl-4 border-l-2 border-dashed border-emerald-300 dark:border-emerald-800">
                      {topics.map((topic, tIdx) => {
                        const isTopicSelected = selectedTopicId === topic.id && selectedScope === 'topic';
                        const isTopicExpanded = Boolean(expandedTopics[topic.id]);
                        const subTopics = topic.sub_topics || [];

                        return (
                          <div
                            key={topic.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isTopicSelected
                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {subTopics.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandTopic(topic.id)}
                                    className="p-1 text-neutral-400"
                                  >
                                    {isTopicExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                                <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 truncate">
                                  {tIdx + 1}. {topic.title}
                                </span>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant={isTopicSelected ? 'primary' : 'ghost'}
                                onClick={() => handleSelectTopic(unit, topic)}
                                className={`text-[11px] h-7 px-2.5 rounded-lg font-semibold ${
                                  isTopicSelected
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'text-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                }`}
                              >
                                {isTopicSelected ? 'Selected' : 'Select Topic'}
                              </Button>
                            </div>

                            {/* Sub-topics list (Expanded) */}
                            {isTopicExpanded && subTopics.length > 0 && (
                              <div className="mt-2 ml-4 pl-3 border-l border-neutral-300 dark:border-neutral-700 space-y-1.5 pt-1">
                                {subTopics.map((st) => {
                                  const isSubSelected = selectedSubTopicId === st.id && selectedScope === 'sub_topic';
                                  return (
                                    <div
                                      key={st.id}
                                      className="flex items-center justify-between text-xs py-1"
                                    >
                                      <span className="text-neutral-600 dark:text-neutral-400 truncate pr-2">
                                        • {st.title}
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={isSubSelected ? 'primary' : 'ghost'}
                                        onClick={() => handleSelectSubTopic(unit, topic, st)}
                                        className={`text-[10px] h-6 px-2 rounded-md ${
                                          isSubSelected
                                            ? 'bg-purple-600 text-white'
                                            : 'text-neutral-500 hover:text-neutral-900'
                                        }`}
                                      >
                                        {isSubSelected ? 'Sub-topic Selected' : 'Select'}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Topic Inline */}
                      {addingTopicToUnitId === unit.id ? (
                        <div className="flex gap-2 pt-1">
                          <Input
                            placeholder="e.g. Electric Dipole Moment"
                            value={newTopicTitle}
                            onChange={e => setNewTopicTitle(e.target.value)}
                            className="h-8 text-xs rounded-lg"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddTopic(unit.id)}
                            className="h-8 bg-emerald-600 text-white text-xs px-2.5 rounded-lg"
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddingTopicToUnitId(null)}
                            className="h-8 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingTopicToUnitId(unit.id)}
                          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 pt-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Topic to Unit {unit.unit_number || uIdx + 1}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
