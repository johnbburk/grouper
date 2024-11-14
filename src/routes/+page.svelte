<script lang="ts">
  import type { PageData } from './$types';
  import Modal from '$lib/components/Modal.svelte';
  import AddClassForm from '$lib/components/AddClassForm.svelte';
  
  export let data: PageData;
  
  let showAddClassModal = false;
  
  function openAddClassModal() {
    showAddClassModal = true;
  }
  
  function closeAddClassModal() {
    showAddClassModal = false;
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">My Classes</h1>
  
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {#each data.classes as class_}
      <div class="border rounded-lg hover:shadow-lg transition-shadow p-4">
        <h2 class="text-xl font-semibold mb-3">{class_.name}</h2>
        <div class="flex gap-2">
          <a 
            href="/class/{class_.id}/roster" 
            class="flex-1 text-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Roster
          </a>
          <a 
            href="/class/{class_.id}/groups" 
            class="flex-1 text-center px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Groups
          </a>
        </div>
      </div>
    {/each}
    
    <button
      class="p-4 border rounded-lg border-dashed hover:border-solid hover:bg-gray-50"
      on:click={openAddClassModal}
    >
      + Add New Class
    </button>
  </div>
</div>

<Modal
  showModal={showAddClassModal}
  title="Add New Class"
>
  <AddClassForm closeModal={closeAddClassModal} />
</Modal>
