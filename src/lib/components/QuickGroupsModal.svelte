<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let showModal: boolean;
  export let classId: number;
  export let className: string;
  export let groupSize: number;
  export let groups: any[] = [];
  
  const dispatch = createEventDispatcher();
  let showDisplayMode = false;
  
  function handleClose() {
    showDisplayMode = false;
    dispatch('close');
  }
  
  function handleReRandomize() {
    dispatch('reRandomize');
  }
  
  async function handleSaveAndDisplay() {
    const success = await dispatch('saveAndDisplay');
    if (success) {
        showDisplayMode = true;
    }
  }
</script>

{#if showModal}
  {#if showDisplayMode}
    <!-- Full Screen Display Mode -->
    <div class="fixed inset-0 bg-white z-50 overflow-auto">
      <div class="container mx-auto p-8">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold">Groups for {className}</h2>
          <button
            on:click={handleClose}
            class="text-gray-600 hover:text-gray-800 p-2"
            aria-label="Close display mode"
          >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {#each groups as group}
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
  {:else}
    <!-- Regular Modal View -->
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Quick Groups for {className}</h2>
            <button
              class="text-gray-500 hover:text-gray-700"
              on:click={handleClose}
            >
              ✕
            </button>
          </div>
          
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {#each groups as group}
              <div class="border rounded-lg p-3 bg-gray-50">
                <h3 class="font-medium text-blue-600 mb-2">{group.name}</h3>
                <ul class="space-y-1 text-sm">
                  {#each group.students as student}
                    <li class="p-2 bg-white rounded shadow-sm">
                      {student.lastName}, {student.firstName}
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
          
          <div class="flex justify-end gap-3 border-t pt-4">
            <button
              class="px-4 py-2 text-gray-600 hover:text-gray-800"
              on:click={handleClose}
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              on:click={handleReRandomize}
            >
              Re-Randomize
            </button>
            <button
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              on:click={handleSaveAndDisplay}
            >
              Save & Display
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
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
</style> 