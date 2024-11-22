<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import { invalidateAll } from '$app/navigation';
  
  export let data: PageData;
  let studentInput = '';
  let importing = false;
  let deleting: number | null = null;
  
  let newStudentName = '';
  let student1Selection: number | null = null;
  let student2Selection: number | null = null;
  
  let clearingHistory = false;
  
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

  async function handleDelete(studentId: number) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    deleting = studentId;
    try {
      const response = await fetch(
        `/api/class/${$page.params.id}/students/${studentId}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        await invalidateAll();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student');
    } finally {
      deleting = null;
    }
  }
  
  async function addRule() {
    if (!student1Selection || !student2Selection || student1Selection === student2Selection) {
      return;
    }
    
    try {
      const response = await fetch(`/api/class/${data.class.id}/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student1Id: student1Selection,
          student2Id: student2Selection
        })
      });
      
      if (response.ok) {
        // Reset selections
        student1Selection = null;
        student2Selection = null;
        // Refresh the page to show new rule
        window.location.reload();
      } else {
        alert('Failed to add rule. Please try again.');
      }
    } catch (error) {
      console.error('Error adding rule:', error);
      alert('An error occurred while adding the rule.');
    }
  }
  
  async function deleteRule(ruleId: number) {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/class/${data.class.id}/rules/${ruleId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete rule. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('An error occurred while deleting the rule.');
    }
  }

  async function handleClearHistory() {
    if (!confirm('Are you sure you want to clear all previous groups? This cannot be undone.')) {
        return;
    }

    clearingHistory = true;
    try {
        const response = await fetch(`/api/class/${$page.params.id}/students/clear-history`, {
            method: 'POST'
        });

        if (response.ok) {
            alert('Group history cleared successfully');
            await invalidateAll(); // Refresh the page data
        } else {
            alert('Failed to clear group history');
        }
    } catch (error) {
        console.error('Error clearing group history:', error);
        alert('An error occurred while clearing group history');
    } finally {
        clearingHistory = false;
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
    <button
      class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      on:click={handleClearHistory}
      disabled={clearingHistory}
    >
      {#if clearingHistory}
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      {/if}
      {clearingHistory ? 'Clearing History...' : 'Clear All Previous Groups'}
    </button>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="border rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-4">Students</h2>
      {#if data.students.length === 0}
        <p class="text-gray-500 italic">No students added yet.</p>
      {:else}
        <ul class="space-y-1">
          {#each data.students as student}
            <li class="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
              <span>{student.lastName}, {student.firstName}</span>
              <button
                class="text-gray-400 hover:text-red-600 disabled:opacity-50"
                on:click={() => handleDelete(student.id)}
                disabled={deleting === student.id}
                aria-label="Delete student"
              >
                {#if deleting === student.id}
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                {:else}
                  <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                {/if}
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
  
  <!-- Add Rule Section -->
  <div class="mt-8 border-t pt-8">
    <h2 class="text-xl font-bold mb-4">Grouping Rules</h2>
    <p class="text-sm text-gray-600 mb-4">
      Select two students that should never be placed in the same group.
    </p>
    
    <div class="flex gap-4 mb-6">
      <select
        class="flex-1 border rounded p-2"
        bind:value={student1Selection}
      >
        <option value={null}>Select first student</option>
        {#each [...data.students].sort((a, b) => 
          `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`)
        ) as student}
          <option value={student.id}>{student.lastName}, {student.firstName}</option>
        {/each}
      </select>
      
      <select
        class="flex-1 border rounded p-2"
        bind:value={student2Selection}
      >
        <option value={null}>Select second student</option>
        {#each [...data.students].sort((a, b) => 
          `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`)
        ) as student}
          <option value={student.id}>{student.lastName}, {student.firstName}</option>
        {/each}
      </select>
      
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        on:click={addRule}
        disabled={!student1Selection || !student2Selection || student1Selection === student2Selection}
      >
        Add Rule
      </button>
    </div>
    
    <!-- Existing Rules List -->
    {#if data.rules && data.rules.length > 0}
      <div class="space-y-2">
        {#each [...data.rules].sort((a, b) => {
          const aName = `${data.students.find(s => s.id === a.student1Id)?.lastName}, ${data.students.find(s => s.id === a.student1Id)?.firstName}`;
          const bName = `${data.students.find(s => s.id === b.student1Id)?.lastName}, ${data.students.find(s => s.id === b.student1Id)?.firstName}`;
          return aName.localeCompare(bName);
        }) as rule}
          <div class="flex items-center justify-between bg-gray-50 p-3 rounded">
            <span>
              {data.students.find(s => s.id === rule.student1Id)?.lastName}, {data.students.find(s => s.id === rule.student1Id)?.firstName} and 
              {data.students.find(s => s.id === rule.student2Id)?.lastName}, {data.students.find(s => s.id === rule.student2Id)?.firstName}
              cannot be grouped together
            </span>
            <button
              class="text-red-600 hover:text-red-800"
              on:click={() => deleteRule(rule.id)}
            >
              Remove
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-gray-500 italic">No rules added yet.</p>
    {/if}
  </div>
</div> 