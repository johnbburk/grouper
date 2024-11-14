<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { invalidateAll } from '$app/navigation';
  
  export let data: PageData;
  let studentInput = '';
  let importing = false;
  
  async function handleImport() {
    if (!studentInput.trim()) return;
    
    importing = true;
    try {
      const response = await fetch(`/api/class/${$page.params.id}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentList: studentInput }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        studentInput = '';
        await invalidateAll();
      }
    } finally {
      importing = false;
    }
  }
</script>

<div class="container mx-auto p-4">
  <!-- Breadcrumb Navigation -->
  <nav class="flex items-center gap-2 text-sm text-gray-600 mb-6">
    <a 
      href="/" 
      class="hover:text-blue-600 hover:underline"
    >
      Classes
    </a>
    <span class="text-gray-400">→</span>
    <span class="font-medium text-gray-900">Class Roster</span>
  </nav>

  <div class="flex justify-between items-center mb-4">
    <h1 class="text-2xl font-bold">Class Roster</h1>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-4">Students</h2>
      {#if data.students.length === 0}
        <p class="text-gray-500 italic">No students added yet.</p>
      {:else}
        <ul class="space-y-2">
          {#each data.students as student}
            <li class="flex items-center justify-between p-2 hover:bg-gray-50">
              <span>{student.firstName} {student.lastName}</span>
              <button
                class="text-red-500 hover:text-red-700"
                on:click={() => {/* TODO: Handle delete */}}
              >
                Delete
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    
    <div class="border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-4">Add Students</h2>
      <textarea
        bind:value={studentInput}
        placeholder="Enter student names (one per line): FirstName LastName"
        class="w-full h-40 border rounded p-2"
      ></textarea>
      <button
        class="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        on:click={handleImport}
        disabled={importing}
      >
        {importing ? 'Importing...' : 'Import Students'}
      </button>
    </div>
  </div>
</div> 