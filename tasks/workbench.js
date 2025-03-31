import FS from "node:fs/promises";
import FormData from "form-data";
import { getGOBO, random } from "./helpers.js";
import { listChannels, Channels, Sidecar } from './channel.js';

const BLUESKY_URL = "https://bsky.app"
const REDDIT_URL = "https://www.reddit.com"


const run = async function ( config ) {
  const taskName = config.args.task;
  if ( taskName == null ) {
    throw new Error("must specify 'task' for workbench to run");
  }

  const task = tasks[taskName];
  if ( task == null ) {
    throw new Error(`task ${taskName} is not defined`);
  }

  await task( config );
};



const tasks = {

  listChannels: async ( config ) => {
    const gobo = await getGOBO(config);
    const name = config.args.name;
    
    const list = await listChannels(gobo, name);
    console.log( list );
  },

  pauseChannel: async ( config ) => {
    const gobo = await getGOBO(config);
    const id = config.args.id;
    const name = config.args.name;
    if (id) {
      const channel = await gobo.channel.get({id});
      channel.paused = true;
      await gobo.channel.put(channel);
    } else if (name) {
      const list = await listChannels(gobo, name);
      for ( const channel of list ) {
        channel.paused = true;
        await gobo.channel.put(channel);
      }
    } else {
      throw new Error('must specify id or name for target channels');
    }
  },

  unpauseChannel: async ( config ) => {
    const gobo = await getGOBO(config);
    const id = config.args.id;
    const name = config.args.name;
    if (id) {
      const channel = await gobo.channel.get({id});
      channel.paused = false;
      await gobo.channel.put(channel);
    } else if (name) {
      const list = await listChannels(gobo, name);
      for ( const channel of list ) {
        channel.paused = false;
        await gobo.channel.put(channel);
      }
    } else {
      throw new Error('must specify id or name for target channels');
    }
  },

  stopChannel: async ( config ) => {
    const gobo = await getGOBO(config);
    const id = config.args.id;
    const name = config.args.name;
    if (id) {
      const channel = await gobo.channel.get({id});
      channel.processing = false;
      await gobo.channel.put(channel);
    } else if (name) {
      const list = await listChannels(gobo, name);
      for ( const channel of list ) {
        channel.processing = false;
        await gobo.channel.put(channel);
      }
    } else {
      throw new Error('must specify id or name for target channels');
    }
  },

  startChannel: async ( config ) => {
    const gobo = await getGOBO(config);
    const id = config.args.id;
    const name = config.args.name;
    if (id) {
      const channel = await gobo.channel.get({id});
      channel.processing = true;
      await gobo.channel.put(channel);
      console.log(channel)
    } else if (name) {
      const list = await listChannels(gobo, name);
      for ( const channel of list ) {
        channel.processing = true;
        await gobo.channel.put(channel);
      }
    } else {
      throw new Error('must specify id or name for target channels');
    }
  },

  claimChannel: async ( config ) => {
    const gobo = await getGOBO(config);
    const id = config.args.id;
    const name = config.args.name;
    if (id) {
      const channel = await gobo.channel.get({id});
      channel.claimed = true;
      await gobo.channel.put(channel);
    } else if (name) {
      const list = await listChannels(gobo, name);
      for ( const channel of list ) {
        channel.claimed = true;
        await gobo.channel.put(channel);
      }
    } else {
      throw new Error('must specify id or name for target channels');
    }
  },

  unclaimChannel: async ( config ) => {
    const gobo = await getGOBO(config);
    const id = config.args.id;
    const name = config.args.name;
    if (id) {
      const channel = await gobo.channel.get({id});
      channel.claimed = false;
      await gobo.channel.put(channel);
    } else if (name) {
      const list = await listChannels(gobo, name);
      for ( const channel of list ) {
        channel.claimed = false;
        await gobo.channel.put(channel);
      }
    } else {
      throw new Error('must specify id or name for target channels');
    }
  },

  removeChannel: async ( config ) => {
    const gobo = await getGOBO(config);
    const id = config.args.id;
    if (!id) {
      throw new Error('must specify id for target channels');
    }
    const channel = await gobo.channel.get({id});
    if (channel) {
      await gobo.channel.delete(channel);
    }
  },

  addChannel: async ( config ) => {
    const gobo = await getGOBO(config);
    const name = config.args.name;
    if (!name) {
      throw new Error('must specify name for add channel configuration');
    }

    if ( name === "default" ) {
      await gobo.channels.post({ content: { name, shards: [0] }});
      return;
    }
    if ( name === "cron" ) {
      const sidecar = Sidecar.cron;
      await gobo.channels.post({ content: { name, shards: [0], sidecar }});
      return;
    }

    const definition = Channels.definitions[name];
    if (!definition) {
      throw new Error(`channel type ${name} lacks a definition template`);
    }

    const channels = await listChannels(gobo, name);
    let offset = 0;
    for ( const channel of channels ) {
      const last = channel.shards.at(-1);
      if ( last >= offset ) {
        offset = last + 1;
      }
    }

    const size = definition.size;
    const shards = Array.from(Array(size).keys(), (value) => value + offset );
    await gobo.channels.post({ content: { name, shards }});
  },

  customAction: async function (config) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "workbench",
      details: {}
    }});
  },

  fanoutUpdateIdentity: async function ( config ) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "fanout - update identity",
      details: { platform }
    }});
  },

  fanoutPullNotifications: async function ( config ) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "fanout - pull notifications",
      details: { platform }
    }});
  },

  pullSources: async function (config) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "pull sources fanout",
      details: { platform }
    }});
  },

  pullPosts: async function (config) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "pull posts fanout",
      details: { platform }
    }});
  },

  hardReset: async function (config) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "hard reset",
      details: { platform }
    }});
  },

  clearPosts: async function (config) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "clear posts",
      details: { platform }
    }});
  },

  clearLastRetrieved: async function (config) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "clear last retrieved",
      details: { platform }
    }});
  },

  clearNotifications: async function ( config ) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "clear notifications",
      details: { platform }
    }});
  },

  clearCursors: async function (config) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "clear cursors",
      details: { platform }
    }});
  },

  clearNotificationCursors: async function (config) {
    const gobo = await getGOBO(config);
    const platform = config.args.platform ?? "all";
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "clear notification cursors",
      details: { platform }
    }});
  },

  readNotifications: async function (config) {
    const gobo = await getGOBO(config);
    const person_id = Number(config.args.person_id);
  
    console.log(await gobo.personNotificationCount.put({
        person_id,
        count: 0
    }));
  },

  setNotifications: async function (config) {
    const gobo = await getGOBO(config);
    const person_id = Number(config.args.person_id);
  
    console.log(await gobo.personNotificationCount.put({
        person_id,
        count: 6
    }));
  },


  pruneResources: async function (config) {
    const gobo = await getGOBO(config);
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "prune resources",
      details: {}
    }});
  },

  onboardIdentity: async function (config) {
    const gobo = await getGOBO(config);
    const identity = await gobo.identity.get({ id: config.args.id });
  
    await gobo.tasks.post({ content: {
      channel: "default",
      priority: 1,
      name: "flow - onboard sources",
      details: { identity }
    }});
  },

  removePerson: async function (config) {
    const gobo = await getGOBO(config);
    const { person_id } = config.args;
    if ( !person_id ) {
      throw new Error("must specify person id to delete")
    }
  
    await gobo.tasks.post({ content: {
      channel: "default",
      name: "remove person",
      details: { person_id }
    }});
  },
  
  blueskyCreatePost: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();
    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });

    const identity = identities.find( i => i.base_url === BLUESKY_URL );
    if ( identity == null ) {
      throw new Error("unable to find bluesky identity to run test");
    }

    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          content: "This is a test post from GOBO."
        },
        targets: [{
          identity: identity.id,
          metadata: {}
        }]
    }});
  },

  blueskyMediaPost: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();

    const form = new FormData();
    const file = await FS.readFile( "test/image/test.jpg" );
    form.append("image", file, { filename: "canyon" });
    form.append("name", "starry canyon");
    form.append("alt", "This is a starry canyon");

    const draft = await gobo.personDraftImages.post({
      parameters: { person_id: person.id },
      content: form,
    }, {
      headers: {
        "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`
      }
    });

    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });

    const identity = identities.find( i => i.base_url === BLUESKY_URL );
    if ( identity == null ) {
      throw new Error("unable to find bluesky identity to run test");
    }

    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          content: "This is a test post from GOBO.",
          attachments: [ draft.id ]
        },
        targets: [{
          identity: identity.id,
          metadata: {}
        }]
    }});
  },

  blueskyRefreshSessions: async function (config) {
    const gobo = await getGOBO(config);

    await gobo.tasks.post({ content: {
      channel: "default",
      name: "bluesky cycle sessions",
      details: {}
    }});
  },


  mastodonCreatePost: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();
    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });

    const identity = identities.find( i => ! [BLUESKY_URL, REDDIT_URL].includes(i.base_url) );
    if ( identity == null ) {
      throw new Error("unable to find mastodon identity to run test");
    }

    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          content: "This is a test post from GOBO."
        },
        targets: [{
          identity: identity.id,
          metadata: {}
        }]
    }});
  },

  mastodonMediaPost: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();

    const form = new FormData();
    const file = await FS.readFile( "test/image/test.jpg" );
    form.append("image", file, { filename: "canyon" });
    form.append("name", "starry canyon");
    form.append("alt", "This is a starry canyon");

    const draft = await gobo.personDraftImages.post({
      parameters: { person_id: person.id },
      content: form,
    }, {
      headers: {
        "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`
      }
    });

    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });

    const identity = identities.find( i => ! [BLUESKY_URL, REDDIT_URL].includes(i.base_url) );
    if ( identity == null ) {
      throw new Error("unable to find mastodon identity to run test");
    }

    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          content: "This is a test post from GOBO.",
          attachments: [ draft.id ]
        },
        targets: [{
          identity: identity.id,
          metadata: {}
        }]
    }});
  },

  
  redditCreatePost: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();
    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });

    const identity = identities.find( i => i.base_url === REDDIT_URL );
    if ( identity == null ) {
      throw new Error("unable to find mastodon identity to run test");
    }

    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          title: "GOBO Test",
          content: "This is a test post from GOBO."
        },
        targets: [{
          identity: identity.id,
          metadata: {
            subreddit: "gobotest"
          }
        }]
    }});
  },

  redditMediaPost: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();

    let form = new FormData();
    let file = await FS.readFile( "test/image/test.jpg" );
    form.append("image", file, { filename: "canyon" });
    form.append("name", "starry canyon");
    form.append("alt", "This is a starry canyon");

    const draft = await gobo.personDraftImages.post({
      parameters: { person_id: person.id },
      content: form,
    }, {
      headers: {
        "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`
      }
    });

    // form = new FormData();
    // file = await FS.readFile( "test/image/test.jpg" );
    // form.append("image", file, { filename: "canyon" });
    // form.append("name", "starry canyon");
    // form.append("alt", "This is a starry canyon");

    // const draft2 = await gobo.personDraftImages.post({
    //   parameters: { person_id: person.id },
    //   content: form,
    // }, {
    //   headers: {
    //     "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`
    //   }
    // });

    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });

    const identity = identities.find( i => i.base_url === REDDIT_URL );
    if ( identity == null ) {
      throw new Error("unable to find mastodon identity to run test");
    }

    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          title: "GOBO Test",
          content: "This is a test post from GOBO.",
          attachments: [ draft.id ]
          // attachments: [ draft.id, draft2.id ]
        },
        targets: [{
          identity: identity.id,
          metadata: {
            subreddit: "gobotest"
          }
        }]
    }});
  },


  // bluesky text post test: 87367
  // bluesky identity: 201
  // mastodon text post: 87375
  // mastodon identity: 109
  // reddit text post: 87377
  // reddit identity: 61

  testAddPostEdge: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();
    const edge = await gobo.person_post_edges.post({
      parameters: { person_id: person.id },
      content: {
        identity: 61,
        post: 87377,
        name: "upvote"
      }
    });

    console.log(edge);
  },

  testRemovePostEdge: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();
    await gobo.person_post_edge.delete({
      person_id: person.id,
      id: 7
    });
  },


  testBlueskyQuote: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();

    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });
  
    const identity = identities.find( i => i.base_url === BLUESKY_URL );
    if ( identity == null ) {
      throw new Error("unable to find bluesky identity to run test");
    }

    const postGraph = await gobo.postGraph.get({ id: 87367 });
    const quote = postGraph.posts.find( p => p.id === postGraph.feed[0] );
      
    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          content: "This is a test quote post from GOBO."
        },
        targets: [{
          identity: identity.id,
          metadata: { quote }
        }]
    }});
  },


  testBlueskyReply: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();

    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });
  
    const identity = identities.find( i => i.base_url === BLUESKY_URL );
    if ( identity == null ) {
      throw new Error("unable to find bluesky identity to run test");
    }

    const postGraph = await gobo.postGraph.get({ id: 87367 });
    const reply = postGraph.posts.find( p => p.id === postGraph.feed[0] );
      
    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          content: "This is a test reply post from GOBO."
        },
        targets: [{
          identity: identity.id,
          metadata: { reply }
        }]
    }});
  },


  testMastodonReply: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();

    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });
  
    const identity = identities.find( i => ! [BLUESKY_URL, REDDIT_URL].includes(i.base_url) );
    if ( identity == null ) {
      throw new Error("unable to find mastodon identity to run test");
    }

    const postGraph = await gobo.postGraph.get({ id: 87375 });
    const reply = postGraph.posts.find( p => p.id === postGraph.feed[0] );
      
    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          content: "This is a test reply post from GOBO."
        },
        targets: [{
          identity: identity.id,
          metadata: { reply }
        }]
    }});
  },



  testRedditReply: async function (config) {
    const gobo = await getGOBO(config);
    const person = await gobo.me.get();

    const identities = await gobo.personIdentities.get({
      person_id: person.id
    });
  
    const identity = identities.find( i => i.base_url === REDDIT_URL );
    if ( identity == null ) {
      throw new Error("unable to find bluesky identity to run test");
    }

    const postGraph = await gobo.postGraph.get({ id: 87377 });
    const reply = postGraph.posts.find( p => p.id === postGraph.feed[0] );
      
    await gobo.personPosts.post({ 
      parameters: {
        person_id: person.id
      },
      content: {
        post: {
          content: "This is a test reply post from GOBO."
        },
        targets: [{
          identity: identity.id,
          metadata: { reply }
        }]
    }});
  },

  testNotificationFeed: async function (config) {
    const gobo = await getGOBO(config);
    const personID = config.args.person_id;
    if ( personID == null ) {
      throw new Error("must specify 'person_id' to fetch notifications");
    }
    const identityID = config.args.identity_id;
    if ( identityID == null ) {
      throw new Error("must specify 'identity_id' to fetch notifications");
    }
   
    const feed = await gobo.personNotifications.get({ 
      person_id: personID,
      id: identityID,
      "view": "mentions"
    });

    console.log(feed);
  },

  testDismissNotification: async function (config) {
    const gobo = await getGOBO(config);
    const personID = config.args.person_id;
    if ( personID == null ) {
      throw new Error("must specify 'person_id' to fetch notifications");
    }
    const identityID = config.args.identity_id;
    if ( identityID == null ) {
      throw new Error("must specify 'identity_id' to fetch notifications");
    }
    const notificationID = config.args.notification_id;
   
    const notification = await gobo.personNotification.post({
      parameters: { 
        person_id: personID,
        identity_id: identityID,
        id: notificationID
      }    
    });

    console.log(notification);
  },


  storeDelete: async function (config) {
    const gobo = await getGOBO(config);

    await gobo.personStore.delete({
      person_id: 3,
      name: "welcome"
    });
  },

  bootstrapPlatformLabels: async function (config) {
    const gobo = await getGOBO(config);

    await gobo.tasks.post({ content: {
      channel: "default",
      name: "bootstrap platform labels",
      details: {}
    }});
  },

  listPeople: async function ( config ) {
    const gobo = await getGOBO( config );
    const people = await gobo.people.get({ per_page: 100 });
    console.log(people);
  },

  listIdentities: async function ( config ) {
    const gobo = await getGOBO( config );
    const identities = await gobo.identities.get({ per_page: 200 });
    console.log(identities);
  },

  createKey: async function ( config ) {
    const gobo = await getGOBO( config );
    const person_id = Number(config.args.person_id );

    const key = await gobo.goboKeys.post({ content: {
      person_id,
      key: await random({ length: 32 })
    }});
    console.log(key);
  },

  sendVerification: async function ( config ) {
    const gobo = await getGOBO( config );
    const person_id = Number(config.args.person_id );

    await gobo.actionResendEmailVerification.post({
      parameters: { person_id },
    });
  },

};



export {
  run
}

