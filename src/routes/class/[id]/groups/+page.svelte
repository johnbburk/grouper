<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { dndzone } from 'svelte-dnd-action';
  
  export let data: PageData;
  let groupSize = 4;
  let selectedStudents = new Set(data.students.map(s => s.id));
  let randomizing = false;
  let saving = false;
  let currentGroups: Array<{ 
    id: number; 
    name: string; 
    students: Array<{ 
      id: number; 
      firstName: string; 
      lastName: string 
    }> 
  }> = [];
  
  // DnD configuration
  const flipDurationMs = 300;
  
  let showDisplayMode = false;
  let saveSuccess = false;
  let saveError = false;
  
  // Add this function to sort the students list
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
    selectedStudents = selectedStudents; // Trigger reactivity
  }
  
  function selectAll() {
    selectedStudents = new Set(data.students.map(s => s.id));
  }
  
  function deselectAll() {
    selectedStudents.clear();
    selectedStudents = selectedStudents;
  }

  function sortStudentsAlphabetically(students: Array<{ id: number; firstName: string; lastName: string }>) {
    return [...students].sort((a, b) => {
      const nameA = `${a.lastName}, ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName}, ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
  
  async function calculateGroupScore(students: Array<{ id: number; firstName: string; lastName: string }>) {
    try {
      // Get grouping history for all students in the group
      const historyPromises = students.map(async student => {
        const response = await fetch(
          `/api/class/${$page.params.id}/students/${student.id}/history`
        );
        if (!response.ok) return [];
        const data = await response.json();
        return data.groupedStudents || [];
      });

      const histories = await Promise.all(historyPromises);
      let score = 0;

      // Calculate score based on how many times each pair has worked together
      for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
          const student1History = histories[i];
          const student2 = students[j];
          
          // Find how many times student2 appears in student1's history
          const pairCount = student1History.find(h => h.id === student2.id)?.groupCount || 0;
          score += pairCount;
        }
      }

      return score;
    } catch (error) {
      console.error('Error calculating group score:', error);
      return 0;
    }
  }

  async function handleDndConsider(e: CustomEvent<{ items: Array<{ id: number; firstName: string; lastName: string }> }>, groupIndex: number) {
    const newGroups = [...currentGroups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      students: e.detail.items
    };
    currentGroups = newGroups;
  }

  async function handleDndFinalize(e: CustomEvent<{ items: Array<{ id: number; firstName: string; lastName: string }> }>, groupIndex: number) {
    const newGroups = [...currentGroups];
    const sortedStudents = sortStudentsAlphabetically(e.detail.items);
    
    // Calculate new score for the modified group
    const score = await calculateGroupScore(sortedStudents);
    
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      students: sortedStudents,
      score
    };
    
    currentGroups = newGroups;
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
          studentIds: Array.from(selectedStudents)
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Received groups:', result.groups);
        
        // Sort students within each group
        currentGroups = result.groups.map((group: { 
          id: number; 
          name: string; 
          students: Array<{ id: number; firstName: string; lastName: string }> 
        }) => ({
          ...group,
          students: sortStudentsAlphabetically(group.students)
        }));
        
        console.log('Processed groups:', currentGroups);
      } else {
        const error = await response.json();
        console.error('Error creating groups:', error);
        alert('Failed to create groups. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
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
      const response = await fetch(`/api/class/${$page.params.id}/groups/save`, {
        method: 'POST',
        body: JSON.stringify({ groups: currentGroups }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        saveSuccess = true;
        // If a student's history is being displayed, refresh it
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
      console.error('Error saving groups:', error);
      saveError = true;
      setTimeout(() => {
        saveError = false;
      }, 3000);
    } finally {
      saving = false;
    }
  }

  // Add this new function to refresh student history
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
  } | null = null;
  
  async function showStudentHistory(student: { id: number; firstName: string; lastName: string }) {
    selectedStudentHistory = student;
    await refreshStudentHistory(student);
  }
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
    <!-- Student Selection Panel - Now with more compact styling -->
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

    <!-- Group Controls and Display Panel - Now 8 columns wide -->
    <div class="col-span-8 border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-4">Create Groups</h2>
      
      <div class="space-y-4">
        <div class="flex gap-4 items-center">
          <div class="w-48">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Students per Group
            </label>
            <input 
              type="number" 
              bind:value={groupSize}
              min="2"
              max={selectedStudents.size}
              class="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div class="flex-1 text-sm text-gray-600">
            This will create {Math.ceil(selectedStudents.size / groupSize)} groups
            {#if selectedStudents.size % groupSize !== 0}
              <br>
              (The last group will have {selectedStudents.size % groupSize} students)
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
            class="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed relative"
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
              <div class="border rounded-lg p-3 bg-gray-50 relative">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="font-medium text-blue-600">{group.name}</h4>
                  {#if group.score !== undefined}
                    <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Score: {group.score}
                    </span>
                  {/if}
                </div>
                <section
                  use:dndzone={{
                    items: group.students,
                    flipDurationMs,
                    dragDisabled: randomizing || saving
                  }}
                  on:consider={(e) => handleDndConsider(e, groupIndex)}
                  on:finalize={(e) => handleDndFinalize(e, groupIndex)}
                  class="min-h-[50px]"
                >
                  {#each group.students as student (student.id)}
                    <div class="p-2 mb-1 bg-white rounded shadow-sm cursor-move hover:shadow-md transition-shadow">
                      {student.lastName}, {student.firstName}
                    </div>
                  {/each}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
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
  <div class="col-span-4 border rounded-lg p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">
        History for {selectedStudentHistory.lastName}, {selectedStudentHistory.firstName}
      </h2>
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
{/if}

<style>
  section {
    padding: 0.5rem;
    border-radius: 0.25rem;
    background-color: rgba(255, 255, 255, 0.5);
  }

  section:empty {
    padding: 1.5rem;
    border: 2px dashed #e2e8f0;
  }

  /* Add styles for the fullscreen display */
  .fixed {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
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

  /* Add animation for notifications */
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  .animate-fade-out {
    animation: fadeOut 0.3s ease-out 2.7s forwards;
  }
</style> 