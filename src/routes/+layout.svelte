<script lang="ts">
	import '../app.css';
	import logo from '$lib/assets/logoonly.png';
</script>

<div class="min-h-screen">
  <header class="border-b">
    <div class="container mx-auto p-4">
      <div class="flex items-center">
        <a href="/" class="text-2xl font-bold">
          <img src={logo} alt="Grouper Logo" class="h-8">
        </a>
      </div>
    </div>
  </header>

  <main>
    <slot />
  </main>
</div>
