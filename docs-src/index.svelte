<script>
  import Basic from "./components/Basic.svelte";
  import YupValidation from "./components/Yup.svelte";
  import CustomValidation from "./components/Custom.svelte";
  import FormArray from "./components/Array.svelte";
  import Helpers from "./components/Helpers.svelte";
  import { Router, Route, Link } from "svelte-routing";
</script>

<style>
  :root {
    --primary: #000;
    --primary-lighter: #f2f2f2;
  }

  .layout {
    display: flex;
    padding: 50px;
  }

  .aside {
    margin-right: 100px;
  }

  nav {
    display: flex;
    flex-direction: column;
    margin-top: 50px;
  }

  .main {
    max-width: 768px;
    width: 100%;
  }

  .logo {
    max-width: 182.5px;
  }
</style>

<Router>
  <div class="layout">
    <aside class="aside">
      <img alt="logo of svelte forms lib" class="logo" src="./logo.png" />
      <nav>
        <Link to="/basic">Basic</Link>
        <Link to="/yup">Yup validation</Link>
        <Link to="/custom">Custom validation</Link>
        <Link to="/array">Forms array</Link>
        <Link to="/helpers">Helper components</Link>
      </nav>
    </aside>
    <main class="main">
      <Route path="/basic" component={Basic} />
      <Route path="/yup" component={YupValidation} />
      <Route path="/array" component={FormArray} />
      <Route path="/custom" component={CustomValidation} />
      <Route path="/helpers" component={Helpers} />
    </main>
  </div>
</Router>
