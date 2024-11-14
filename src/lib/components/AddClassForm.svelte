<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  
  export let closeModal: () => void;
  
  let className = '';
  let submitting = false;
  
  async function handleSubmit(event: SubmitEvent) {
    submitting = true;
    const form = event.target as HTMLFormElement;
    const response = await fetch('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: className })
    });

    if (response.ok) {
      className = '';
      await invalidateAll();
      closeModal();
    }
    submitting = false;
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
  <div>
    <label for="className" class="block text-sm font-medium text-gray-700 mb-1">
      Class Name
    </label>
    <input
      type="text"
      id="className"
      bind:value={className}
      class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Enter class name"
      required
    />
  </div>
  
  <div class="flex justify-end gap-2">
    <button
      type="button"
      class="px-4 py-2 text-gray-600 hover:text-gray-800"
      on:click={closeModal}
    >
      Cancel
    </button>
    <button
      type="submit"
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      disabled={submitting}
    >
      {submitting ? 'Adding...' : 'Add Class'}
    </button>
  </div>
</form> 