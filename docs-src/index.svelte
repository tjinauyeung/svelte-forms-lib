<script>
  import Basic from "./examples/Basic/component.svelte";
  import YupValidation from "./examples/Yup/component.svelte";
  import CustomValidation from "./examples/Custom/component.svelte";
  import FormArray from "./examples/Array/component.svelte";
  import Helpers from "./examples/Helpers/component.svelte";
  import { Router, Route, Link } from "svelte-routing";
</script>

<style>
  .layout {
    display: flex;
    position: relative;
    height: 100vh;
    overflow: scroll;
  }

  .aside {
    background: var(--secondary);
    position: sticky;
    top: 0;
    bottom: 0;
    left: 0;
    padding: 40px 40px 50px;
    flex: 0 0 360px;
    color: #fff;
  }

  .version {
    margin: 30px 0 0;
    padding: 12px;
  }

  @media (max-width: 768px) {
    .layout {
      flex-direction: column;
    }

    .aside {
      width: 100%;
      position: relative;
    }
  }

  nav {
    display: flex;
    flex-direction: column;
  }

  .wrapper {
    flex: 1;
    width: 100%;
  }

  .container {
    max-width: 900px;
    padding: 40px;
    min-height: calc(100vh - 120px);
  }

  .logo {
    max-width: 140px;
  }

  footer {
    width: 100%;
    background: var(--secondary);
    padding: 20px;
    height: 120px;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .avatar {
    width: 48px;
    height: 48px;
  }

  .badge {
    padding: 6px 10px;
    text-transform: uppercase;
    color: var(--secondary);
    font-weight: bold;
    margin-left: 8px;
    font-size: 11px;
    letter-spacing: 1.2px;
    border-radius: 50px;
    background: var(--primary-dark);
  }

  .nav-section {
    font-size: 18px;
    margin-top: 40px;
    margin-bottom: 12px;
    font-weight: normal;
  }

  .github {
    position: fixed;
    top: 0;
    right: 0;
    padding: 0;
    z-index: 1;
  }
  .github img {
    width: 100px;
    height: 100px;
  }
</style>

<Router>
  <div class="layout">
    <aside class="aside">
      <img alt="logo of svelte forms lib" class="logo" src="./logo.png" />
      <p class="version">V1.0.0</p>
      <nav>
        <h4 class="nav-section">Getting started</h4>
        <Link to="/introduction">Introduction</Link>
        <h4 class="nav-section">Examples</h4>
        <Link to="/basic">Basic</Link>
        <Link to="/yup">Yup validation</Link>
        <Link to="/custom">Custom validation</Link>
        <Link to="/array">Forms array</Link>
        <Link to="/helpers">
          Helper components
          <span class="badge">new</span>
        </Link>
      </nav>
    </aside>
    <main class="wrapper">
      <a class="github" href="https://github.com/tjinauyeung/svelte-forms-lib" target="_blank">
        <img src="./github.png" alt="github repository for svelte forms lib" />
      </a>
      <div class="container">
        <Route path="/basic" component={Basic} />
        <Route path="/yup" component={YupValidation} />
        <Route path="/array" component={FormArray} />
        <Route path="/custom" component={CustomValidation} />
        <Route path="/helpers" component={Helpers} />
      </div>
      <footer>
        Open source project by
        <a href="https://www.tjinauyeung.com" target="_blank">
          <img
            class="avatar"
            src="https://tjinauyeung.com/static/avatar-b2c241e7fd2f877f0c3948067254afc3.png"
            alt="avatar of Tjin Au Yeung"
          />
        </a>
      </footer>
    </main>
  </div>
</Router>
