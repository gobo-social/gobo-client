export const listChannels = async ( gobo, name ) => {
  if ( name === "all" ) {
    name = undefined;
  }

  const list = [];
  let page = 1;
  while ( true ) {
    const results = await gobo.channels.get({ name, page });
    list.push( ...results );
    page++;
    if (results.length !== 25) {
      break;
    }
  }

  return list;
}


export const Sidecar = {
  cron: [
    {
      minutes: 60,
      task: {
        channel: "default",
        name: "fanout - update identity",
        details: {
          platform: "all"
        }
      }
    },
    {
      minutes: 15,
      task: {
        channel: "default",
        name: "fanout - pull notifications",
        details: {
          platform: "all"
        }
      }
    },
      {
      minutes: 60,
      task: {
        channel: "default",
        name: "prune resources",
      }
    }
  ],
};


export const Channels = {
  definitions: {
    default: {
      name: "default",
      size: 0,
    },
    cron: {
      name: "cron",
      size: 0,
      sidecar: JSON.stringify( Sidecar.cron ),
    },
    bluesky: {
      name: "bluesky",
      size: 12,
    },
    linkedin: {
      name: "linkedin",
      size: 1,
    },
    mastodon: {
      name: "mastodon",
      size: 12,
    },
    reddit: {
      name: "reddit",
      size: 1,
    },
    smalltown: {
      name: "smalltown",
      size: 12,
    },
  },
};
