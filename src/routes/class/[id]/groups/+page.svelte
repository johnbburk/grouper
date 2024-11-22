<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { fade } from 'svelte/transition';
  import { dndzone } from 'svelte-dnd-action';
  import { onMount } from 'svelte';
  
  export let data: PageData;
  let groupSize = 2;
  let selectedStudents = new Set(data.students.map(s => s.id));
  let randomizing = false;
  let saving = false;
  let currentGroups: Array<{ 
    id: number; 
    name: string; 
    students: Array<{ 
      id: number; 
      firstName: string; 
      lastName: string;
      nonStandardGroupings?: number;
    }>;
    score?: number;
  }> = [];
  
  let showDisplayMode = false;
  let saveSuccess = false;
  let saveError = false;
  
  const sortedStudents = [...data.students].sort((a, b) => {
    const nameA = `${a.lastName}, ${a.firstName}`.toLowerCase();
    const nameB = `${b.lastName}, ${b.firstName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  function toggleStudent(studentId: number) {
    if (selectedStudents.has(studentId)) {
      selectedStudents.delete(studentId);
    } else {
      selectedStudents.add(studentId);
    }
    selectedStudents = selectedStudents;
  }
  
  function selectAll() {
    selectedStudents = new Set(data.students.map(s => s.id));
  }
  
  function deselectAll() {
    selectedStudents.clear();
    selectedStudents = selectedStudents;
  }
  
  async function handleRandomize() {
    if (selectedStudents.size < 2) {
      alert('Please select at least 2 students to create groups');
      return;
    }
    
    randomizing = true;
    try {
      const response = await fetch(`/api/class/${$page.params.id}/groups`, {
        method: 'POST',
        body: JSON.stringify({ 
          groupSize,
          studentIds: Array.from(selectedStudents),
          considerNonStandard: true,
          preferOversizeGroups
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const newGroups = [];
        for (const group of result.groups) {
          const score = await calculateGroupScore(group.students);
          newGroups.push({
            ...group,
            score
          });
        }
        currentGroups = newGroups;
      } else {
        const error = await response.json();
        alert('Failed to create groups. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleRandomize:', error);
      alert('An error occurred while creating groups.');
    } finally {
      randomizing = false;
    }
  }

  async function handleSave() {
    if (!currentGroups.length) return;

    saving = true;
    saveSuccess = false;
    saveError = false;
    
    try {
      const nonStandardUpdates = currentGroups
        .filter(group => isNonStandardGroup(group, groupSize))
        .flatMap(group => group.students.map(student => student.id));

      const response = await fetch(`/api/class/${$page.params.id}/groups/save`, {
        method: 'POST',
        body: JSON.stringify({ 
          groups: currentGroups,
          nonStandardStudentIds: nonStandardUpdates
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        saveSuccess = true;
        if (selectedStudentHistory) {
          await refreshStudentHistory(selectedStudentHistory);
        }
        setTimeout(() => {
          saveSuccess = false;
        }, 3000);
      } else {
        saveError = true;
        setTimeout(() => {
          saveError = false;
        }, 3000);
      }
    } catch (error) {
      saveError = true;
      setTimeout(() => {
        saveError = false;
      }, 3000);
    } finally {
      saving = false;
    }
  }

  function toggleDisplayMode() {
    showDisplayMode = !showDisplayMode;
  }

  let selectedStudentHistory: {
    id: number;
    firstName: string;
    lastName: string;
  } | null = null;
  
  let studentHistory: {
    neverGrouped: Array<{
      id: number;
      firstName: string;
      lastName: string;
      groupCount: number;
    }>;
    groupedStudents: Array<{
      id: number;
      firstName: string;
      lastName: string;
      groupCount: number;
    }>;
    groupHistory: Array<{
      id: number;
      name: string;
      date: string;
      members: string[];
    }>;
    nonStandardGroupings: number;
  } | null = null;
  
  async function showStudentHistory(student: { id: number; firstName: string; lastName: string }) {
    selectedStudentHistory = student;
    await refreshStudentHistory(student);
  }

  async function refreshStudentHistory(student: { id: number; firstName: string; lastName: string }) {
    try {
      const response = await fetch(
        `/api/class/${$page.params.id}/students/${student.id}/history`
      );
      if (response.ok) {
        studentHistory = await response.json();
      }
    } catch (error) {
      console.error('Error refreshing student history:', error);
    }
  }

  const flipDurationMs = 200;

  async function calculateGroupScore(students: Array<{ id: number }>) {
    if (!students || students.length < 2) return 0;
    
    try {
        let score = 0;
        for (let i = 0; i < students.length; i++) {
            for (let j = i + 1; j < students.length; j++) {
                const url = `/api/class/${$page.params.id}/students/${students[i].id}/pairs/${students[j].id}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    console.error('Failed to fetch pair score:', {
                        status: response.status,
                        statusText: response.statusText,
                        url
                    });
                    continue;
                }
                
                const data = await response.json();
                score += data.pairCount || 0;
            }
        }
        return score;
    } catch (error) {
        console.error('Error calculating group score:', error);
        return 0;
    }
  }

  function createDnDItems(students: Array<{ id: number; firstName: string; lastName: string }>, groupIndex: number) {
    return students
      .filter(student => student.id !== undefined && typeof student.id === 'number')
      .map(student => ({
        ...student,
        uniqueId: `${groupIndex}-${student.id}-${Math.random()}`
      }));
  }

  let dragSourceGroupIndex: number | null = null;
  let draggedStudent: { id: number; firstName: string; lastName: string } | null = null;
  let originalGroupState: typeof currentGroups | null = null;
  let studentPlacements = new Map<number, number>();

  interface DndStudent {
    id: number;
    firstName: string;
    lastName: string;
    uniqueId: string;
  }

  interface DndEvent {
    items: DndStudent[];
    info?: {
      id: string;
    };
  }

  async function handleDndConsider(e: CustomEvent<DndEvent>, targetGroupIndex: number) {
    if (dragSourceGroupIndex === null) {
      dragSourceGroupIndex = targetGroupIndex;
      originalGroupState = JSON.parse(JSON.stringify(currentGroups));
      
      studentPlacements.clear();
      currentGroups.forEach((group, groupIndex) => {
        group.students.forEach(student => {
          studentPlacements.set(student.id, groupIndex);
        });
      });
      
      const currentStudents = currentGroups[targetGroupIndex].students;
      draggedStudent = currentStudents.find(s => !e.detail.items.some(item => item.id === s.id)) || null;
    }
    
    const newGroups = [...currentGroups];
    
    if (dragSourceGroupIndex === targetGroupIndex && originalGroupState) {
      newGroups[targetGroupIndex] = {
        ...originalGroupState[targetGroupIndex]
      };
      currentGroups = newGroups;
      return;
    }
    
    let validItems = e.detail.items
      .filter(item => 
        item.id !== undefined && 
        typeof item.id === 'number' && 
        !String(item.id).includes('dnd-shadow')
      )
      .filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );

    validItems.forEach(item => {
      const previousGroupIndex = studentPlacements.get(item.id);
      if (previousGroupIndex !== undefined && previousGroupIndex !== targetGroupIndex) {
        newGroups[previousGroupIndex] = {
          ...newGroups[previousGroupIndex],
          students: newGroups[previousGroupIndex].students.filter(s => s.id !== item.id)
        };
      }
      studentPlacements.set(item.id, targetGroupIndex);
    });

    newGroups[targetGroupIndex] = {
      ...newGroups[targetGroupIndex],
      students: validItems.map(item => ({
        id: item.id,
        firstName: item.firstName,
        lastName: item.lastName
      }))
    };

    currentGroups = newGroups;
    checkForDuplicates();
  }

  async function handleDndFinalize(e: CustomEvent<DndEvent>, targetGroupIndex: number) {
    if (dragSourceGroupIndex === targetGroupIndex && originalGroupState) {
      currentGroups = originalGroupState;
      dragSourceGroupIndex = null;
      draggedStudent = null;
      originalGroupState = null;
      studentPlacements.clear();
      return;
    }
    
    const newGroups = [...currentGroups];
    
    let validItems = e.detail.items
      .filter(item => 
        item.id !== undefined && 
        typeof item.id === 'number' && 
        !String(item.id).includes('dnd-shadow')
      )
      .filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );

    const updatedStudents = validItems.map(item => ({
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName
    }));
    
    if (dragSourceGroupIndex !== null) {
        const sourceGroupScore = await calculateGroupScore(
            newGroups[dragSourceGroupIndex].students
        );
        newGroups[dragSourceGroupIndex] = {
            ...newGroups[dragSourceGroupIndex],
            score: sourceGroupScore
        };
        
        const targetGroupScore = await calculateGroupScore(updatedStudents);
        newGroups[targetGroupIndex] = {
            ...newGroups[targetGroupIndex],
            students: updatedStudents,
            score: targetGroupScore
        };
    }
    
    dragSourceGroupIndex = null;
    draggedStudent = null;
    originalGroupState = null;
    studentPlacements.clear();
    
    currentGroups = newGroups;
    checkForDuplicates();
  }

  function checkForDuplicates() {
    const allStudents = new Set();
    let duplicates: Array<{
      studentId: number;
      studentName: string;
      groupIndex: number;
    }> = [];
    
    currentGroups.forEach((group, groupIndex) => {
      group.students.forEach(student => {
        if (allStudents.has(student.id)) {
          duplicates.push({
            studentId: student.id,
            studentName: `${student.lastName}, ${student.firstName}`,
            groupIndex
          });
        } else {
          allStudents.add(student.id);
        }
      });
    });
    
    if (duplicates.length > 0) {
      console.warn('Found duplicate students:', duplicates);
    }
  }

  $: if (currentGroups) {
    checkForDuplicates();
  }

  onMount(() => {});

  function isNonStandardGroup(group: typeof currentGroups[0], targetSize: number): boolean {
    return group.students.length !== targetSize;
  }

  let preferOversizeGroups = false;
</script>

<div class="container mx-auto p-4">
  <!-- Breadcrumb Navigation -->
  <nav class="flex items-center gap-2 text-sm text-gray-600 mb-6">
    <a href="/" class="hover:text-blue-600 hover:underline">
      Classes
    </a>
    <span class="text-gray-400">→</span>
    <span class="font-medium text-gray-900">Groups</span>
  </nav>

  <div class="grid grid-cols-12 gap-6">
    <!-- Student Selection Panel -->
    <div class="col-span-4 border rounded-lg p-4">
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xl font-semibold">Students Present</h2>
        <div class="flex gap-2">
          <button
            class="text-sm text-blue-600 hover:text-blue-800"
            on:click={selectAll}
          >
            Select All
          </button>
          <span class="text-gray-300">|</span>
          <button
            class="text-sm text-blue-600 hover:text-blue-800"
            on:click={deselectAll}
          >
            Deselect All
          </button>
        </div>
      </div>
      
      <div class="space-y-0.5 max-h-[600px] overflow-y-auto border rounded bg-gray-50 p-1">
        {#each sortedStudents as student}
          <div class="flex items-center py-1 px-2 hover:bg-white rounded text-sm">
            <label class="flex-1 flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedStudents.has(student.id)}
                on:change={() => toggleStudent(student.id)}
                class="mr-2 h-4 w-4"
              />
              <span class="truncate">{student.lastName}, {student.firstName}</span>
            </label>
            <button
              class="ml-2 text-blue-500 hover:text-blue-700 text-sm"
              on:click={() => showStudentHistory(student)}
            >
              History
            </button>
          </div>
        {/each}
      </div>
      
      <div class="mt-2 text-sm text-gray-600">
        {selectedStudents.size} students selected
      </div>
    </div>

    <!-- Group Controls and Display Panel -->
    <div class="col-span-8 border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-4">Create Groups</h2>
      
      <div class="space-y-4">
        <div class="flex flex-col gap-4">
          <!-- Students per group input -->
          <div class="flex gap-8 items-start">
            <div class="w-48">
              <label for="group-size" class="block text-sm font-medium text-gray-700 mb-1">
                Students per Group
              </label>
              <input 
                id="group-size"
                type="number" 
                bind:value={groupSize}
                min="2"
                max={selectedStudents.size}
                class="w-full border rounded px-3 py-2"
              />
            </div>

            <!-- Update the slider section -->
            <div class="flex-1">
              <label for="excess-placement" class="block text-sm font-medium text-gray-700 mb-1">
                Excess Student Placement
              </label>
              <div class="flex items-center gap-4">
                <span class="text-sm text-gray-600">Undersize</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    id="excess-placement"
                    type="checkbox" 
                    bind:checked={preferOversizeGroups}
                    class="sr-only peer"
                  >
                  <div class="w-11 h-6 bg-gray-200 rounded-full peer 
                              peer-focus:outline-none peer-focus:ring-4 
                              peer-focus:ring-blue-300 
                              peer-checked:after:translate-x-full 
                              peer-checked:after:border-white 
                              after:content-[''] after:absolute 
                              after:top-[2px] after:left-[2px] 
                              after:bg-white after:border-gray-300 
                              after:border after:rounded-full 
                              after:h-5 after:w-5 after:transition-all 
                              peer-checked:bg-blue-600">
                  </div>
                </label>
                <span class="text-sm text-gray-600">Oversize</span>
              </div>
            </div>
          </div>

          <!-- Update the info text to be more dynamic -->
          <div class="text-sm text-gray-600">
            This will create {Math.ceil(selectedStudents.size / groupSize)} groups
            {#if selectedStudents.size % groupSize !== 0}
              <br>
              {#if preferOversizeGroups}
                {selectedStudents.size % groupSize} students will be added to separate groups
                (making them size {groupSize + 1})
              {:else}
                The last group will have {selectedStudents.size % groupSize} students
              {/if}
            {/if}
          </div>
        </div>

        <div class="flex gap-2">
          <button
            on:click={handleRandomize}
            disabled={selectedStudents.size < 2 || randomizing}
            class="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if randomizing}
              Creating Groups...
            {:else if currentGroups.length}
              Re-Randomize Groups
            {:else}
              Create Random Groups
            {/if}
          </button>
          
          <button
            on:click={handleSave}
            disabled={!currentGroups.length || saving}
            class="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Groups'}
          </button>
        </div>
      </div>

      {#if currentGroups.length > 0}
        <button
          on:click={toggleDisplayMode}
          class="w-full mt-2 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
        >
          Display Groups
        </button>

        <div class="mt-6">
          <h3 class="text-lg font-medium mb-3">Current Groups</h3>
          <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {#each currentGroups as group, groupIndex}
              <div class="border rounded-lg p-3 bg-gray-50">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="font-medium text-blue-600">{group.name}</h4>
                  <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    Score: {group.score ?? 0}
                  </span>
                </div>
                <section
                  use:dndzone={{
                    items: createDnDItems(group.students, groupIndex),
                    flipDurationMs,
                    dragDisabled: randomizing || saving
                  }}
                  on:consider={(e) => handleDndConsider(e, groupIndex)}
                  on:finalize={(e) => handleDndFinalize(e, groupIndex)}
                  class="min-h-[100px] p-2 rounded transition-colors"
                  class:bg-blue-50={group.students.length === 0}
                >
                  {#each createDnDItems(group.students, groupIndex) as student (student.uniqueId)}
                    <div 
                      class="p-2 mb-1 bg-white rounded shadow-sm cursor-move hover:shadow-md transition-shadow"
                      role="button"
                      tabindex="0"
                    >
                      {student.lastName}, {student.firstName}
                    </div>
                  {/each}
                  {#if group.students.length === 0}
                    <div class="text-center text-gray-400 py-2">
                      Drop students here
                    </div>
                  {/if}
                </section>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if showDisplayMode}
  <div class="fixed inset-0 bg-white z-50 overflow-auto">
    <div class="container mx-auto p-8">
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-3xl font-bold">Groups Display</h2>
        <button
          on:click={toggleDisplayMode}
          class="text-gray-600 hover:text-gray-800 p-2"
          aria-label="Close display mode"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {#each currentGroups as group}
          <div class="border rounded-lg p-4 bg-gray-50">
            <h3 class="text-xl font-bold text-blue-600 mb-4">{group.name}</h3>
            <ul class="space-y-2">
              {#each group.students as student}
                <li class="p-3 bg-white rounded shadow-sm">
                  <span class="font-medium">{student.lastName},</span>
                  <span>{student.firstName}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>

      <div class="fixed bottom-8 right-8">
        <button
          on:click={() => window.print()}
          class="bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Groups
        </button>
      </div>
    </div>
  </div>
{/if}

{#if saveSuccess}
  <div 
    class="mt-2 p-2 bg-green-100 text-green-700 rounded-md text-center animate-fade-out"
    transition:fade
  >
    Groups saved successfully!
  </div>
{/if}

{#if saveError}
  <div 
    class="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-center animate-fade-out"
    transition:fade
  >
    Failed to save groups. Please try again.
  </div>
{/if}

{#if selectedStudentHistory && studentHistory}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h2 class="text-xl font-semibold">
            History for {selectedStudentHistory.lastName}, {selectedStudentHistory.firstName}
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            Times in non-standard groups: {studentHistory.nonStandardGroupings}
          </p>
        </div>
        <button
          class="text-gray-500 hover:text-gray-700"
          on:click={() => { selectedStudentHistory = null; studentHistory = null; }}
        >
          ✕
        </button>
      </div>

      <div class="space-y-4">
        {#if studentHistory.neverGrouped.length > 0}
          <div>
            <h3 class="text-lg font-medium mb-2 text-red-600">Never Grouped With:</h3>
            <div class="flex flex-wrap gap-2">
              {#each [...studentHistory.neverGrouped].sort((a, b) => 
                `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`)
              ) as student}
                <span class="text-sm bg-red-50 text-red-700 px-2 py-1 rounded">
                  {student.lastName}, {student.firstName}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        {#if studentHistory.groupedStudents.length > 0}
          <div>
            <h3 class="text-lg font-medium mb-2 text-blue-600">Previous Groupmates:</h3>
            <div class="grid grid-cols-2 gap-2">
              {#each studentHistory.groupedStudents as student}
                <div class="text-sm flex justify-between items-center bg-blue-50 px-2 py-1 rounded">
                  <span>{student.lastName}, {student.firstName}</span>
                  <span class="text-blue-600 font-medium ml-2">
                    ({student.groupCount} time{student.groupCount !== 1 ? 's' : ''})
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div>
          <h3 class="text-lg font-medium mb-2 text-green-600">Previous Groups:</h3>
          <div class="grid grid-cols-2 gap-4">
            {#each [...studentHistory.groupHistory].sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            ) as group}
              <div class="text-sm p-2 bg-white rounded border">
                <div class="flex justify-between items-start mb-1">
                  <span class="font-medium">{group.name}</span>
                  <span class="text-gray-500 text-xs">
                    {new Date(group.date).toLocaleString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                <div class="text-gray-600 text-xs">
                  {group.members.join(', ')}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @media print {
    .fixed {
      position: static;
      overflow: visible;
    }
    
    button {
      display: none;
    }

    .container {
      width: 100%;
      max-width: none;
      padding: 0;
    }

    .grid {
      gap: 1rem;
    }

    .border {
      border: 1px solid #000;
    }

    .shadow-sm {
      box-shadow: none;
    }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  .animate-fade-out {
    animation: fadeOut 0.3s ease-out 2.7s forwards;
  }
</style> 