<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  
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

  function sortStudentsAlphabetically(students: Array<{ firstName: string; lastName: string }>) {
    return [...students].sort((a, b) => {
      const nameA = `${a.lastName}, ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName}, ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
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
        currentGroups = result.groups.map(group => ({
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
    try {
      const response = await fetch(`/api/class/${$page.params.id}/groups/save`, {
        method: 'POST',
        body: JSON.stringify({ groups: currentGroups }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // TODO: Show success message
      }
    } finally {
      saving = false;
    }
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

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Student Selection Panel -->
    <div class="border rounded-lg p-4">
      <div class="flex justify-between items-center mb-4">
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
      
      <div class="space-y-2 max-h-[400px] overflow-y-auto">
        {#each data.students as student}
          <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={selectedStudents.has(student.id)}
              on:change={() => toggleStudent(student.id)}
              class="mr-3"
            />
            <span>{student.lastName}, {student.firstName}</span>
          </label>
        {/each}
      </div>
      
      <div class="mt-4 text-sm text-gray-600">
        {selectedStudents.size} students selected
      </div>
    </div>

    <!-- Group Controls and Display Panel -->
    <div class="border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-4">Create Groups</h2>
      
      <div class="space-y-4">
        <div>
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
        
        <div class="text-sm text-gray-600">
          This will create {Math.ceil(selectedStudents.size / groupSize)} groups
          {#if selectedStudents.size % groupSize !== 0}
            <br>
            (The last group will have {selectedStudents.size % groupSize} students)
          {/if}
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
              Randomize Groups
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
        <div class="mt-6">
          <h3 class="text-lg font-medium mb-3">Current Groups</h3>
          <div class="grid grid-cols-1 gap-4">
            {#each currentGroups as group}
              <div class="border rounded p-3 bg-gray-50">
                <h4 class="font-medium mb-2 text-blue-600">{group.name}</h4>
                <ul class="space-y-1 pl-2">
                  {#each group.students as student}
                    <li class="text-gray-700">{student.lastName}, {student.firstName}</li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div> 