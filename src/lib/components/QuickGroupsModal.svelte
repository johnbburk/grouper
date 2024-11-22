<script lang="ts">
  import Modal from './Modal.svelte';
  import { createEventDispatcher } from 'svelte';
  
  export let showModal: boolean;
  export let className = '';
  export let groups: any[] = [];
  
  const dispatch = createEventDispatcher();
  
  function closeModal() {
    dispatch('close');
    showModal = false;
  }

  function handleReRandomize() {
    dispatch('reRandomize');
  }

  function handleSaveAndDisplay() {
    dispatch('saveAndDisplay');
  }

  $: console.log('QuickGroupsModal received:', { showModal, className, groups });
</script>

<Modal {showModal} {closeModal}>
  <div class="space-y-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">{className} Groups</h2>
      <div class="flex gap-2">
        <button
          class="px-3 py-1 text-gray-600 hover:text-gray-800 border rounded"
          on:click={closeModal}
        >
          Cancel
        </button>
        <button
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          on:click={handleReRandomize}
        >
          Re-Randomize
        </button>
        <button
          class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          on:click={handleSaveAndDisplay}
        >
          Save & Display
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      {#if groups.length === 0}
        <p class="col-span-full text-center text-gray-500">No groups created yet</p>
      {/if}
      {#each groups as group}
        <div class="border rounded-lg p-4">
          <h3 class="font-semibold mb-2">{group.name}</h3>
          <ul class="space-y-1">
            {#each group.students as student}
              <li>{student.lastName}, {student.firstName}</li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </div>
</Modal> 