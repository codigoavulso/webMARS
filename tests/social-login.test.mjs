import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const runtime = await readFile(new URL("../assets/js/app-modules/20-app-runtime.js", import.meta.url), "utf8");
const source = runtime.slice(runtime.indexOf("async function cloudSocialSections("), runtime.indexOf("async function openCloudLoginDialog("));
test("generated account names have a friendly label without replacing the login identity", () => {
  const context = vm.createContext({});
  vm.runInContext(runtime.slice(runtime.indexOf("function getCloudUserDisplayName("), runtime.indexOf("function setCloudSessionState(")), context);
  const user = { username: "user-9a9d35a3e566", email: "joao.silva+cloud@example.test" };
  assert.equal(context.getCloudUserDisplayName(user), "Joao Silva");
  assert.equal(user.username, "user-9a9d35a3e566");
  assert.equal(context.getCloudUserDisplayName({ username: "my-handle", email: user.email }), "my-handle");
  assert.equal(context.getCloudUserDisplayName({ username: user.username }), user.username);
});
function harness({blocked=false, destination="https://accounts.google.com/o/oauth2/v2/auth", authenticated=true}={}) {
  const listeners = new Map(), intervals = [], calls = [], metrics = [];
  let state = null, closed = false;
  const popup = {location:{href:""},get closed(){return closed;},close(){closed=true;}};
  const window = {open:()=>blocked?null:popup,location:new URL("https://webmars.test/"),
    addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name),
    setInterval:fn=>{intervals.push(fn);return 1;},clearInterval(){},setTimeout:()=>2,clearTimeout(){},
    WebMarsUsage:{getContext:()=>"internal",track:(...args)=>metrics.push(args)}};
  const env = {window,URL,AbortSignal,cloudApiBase:"https://backmars.test/api",translateText:s=>s,
    cloudRequestJson:async(path,options)=>{calls.push({path,options});
      if(path.endsWith("/start"))return{url:destination,state:"flow-123"};
      if(path==="/me")return{authenticated,user:authenticated?{id:1,username:"sample"}:null};
      return{providers:["google","facebook","not-supported"]};},
    setCloudSessionState:(...args)=>state=args,refreshCloudProjectSyncDocuments:()=>Promise.resolve()};
  vm.createContext(env);vm.runInContext(source,env);
  return {env,popup,listeners,intervals,calls,metrics,get state(){return state;},
    run:()=>env.startCloudSocialLogin("google","login",{setMessage(){}}),
    message:(changes={})=>listeners.get("message")?.({origin:"https://backmars.test",source:popup,
      data:{type:"webmars-social-auth",state:"flow-123",provider:"google",status:"created"},...changes})};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test("social login rejects messages from another origin, window or flow, then verifies the Cloud session",async()=>{
  const h=harness();const pending=h.run();await tick();
  h.message({origin:"https://attacker.test"});h.message({source:{}});
  h.message({data:{type:"webmars-social-auth",state:"wrong",provider:"google",status:"created"}});
  assert.equal(h.calls.filter(c=>c.path==="/me").length,0);
  h.message();const result=await pending;
  assert.equal(result.close,true);assert.equal(h.state[0],"authenticated");
  assert.equal(h.calls[0].options.body.context,"internal");
  assert(h.metrics.some(([event,detail])=>event==="account_created"&&detail==="google"));
  assert.equal(h.listeners.size,0);assert.equal(h.popup.closed,true);
});

test("popup denial, cancellation, untrusted destinations and missing sessions do not report successful login",async()=>{
  await assert.rejects(harness({blocked:true}).run(),/Allow the sign-in/);
  await assert.rejects(harness({destination:"https://attacker.test/login"}).run(),/Invalid sign-in destination/);
  const cancelled=harness();const waiting=cancelled.run();await tick();cancelled.popup.close();cancelled.intervals[0]();
  assert.equal((await waiting).close,false);assert.equal(cancelled.state,null);
  const missing=harness({authenticated:false});const pending=missing.run();await tick();missing.message();
  await assert.rejects(pending,/Social sign-in failed/);assert.equal(missing.state,null);
});

test("provider discovery builds native dialog actions only for supported providers",async()=>{
  const h=harness();const sections=await h.env.cloudSocialSections();
  assert.equal(sections.length,1);assert.equal(sections[0].fields.length,1);
  assert.equal(sections[0].fields[0].name,"social-google");
  assert(sections[0].fields.every(f=>f.type==="button"&&typeof f.onClick==="function"));
});
