import type { AppSnapshot } from '@shared/types'
import { Button, PageHeader } from '../ui'

const commands = [
  {
    title: 'Start the daemon',
    usage: 'cwp2p [--bind-address <IP>] [--data-channels] [--log-level <level>]',
    body: 'Keeps Causeway running. This app starts it for you. Default bind address is 127.0.0.1. Default log level is warning. Default mode is WireGuard.'
  },
  {
    title: 'status',
    usage: 'cwp2p status',
    body: 'Shows active NetcoreNetwork node count, your local ID, public endpoint, NAT state, connected-peer count, and the same peer details as peer list. A missing-UTXO recovery warning stays visible until restart.'
  },
  {
    title: 'peer add',
    usage: 'cwp2p peer add <name> <peer ID> [<local-port:remote-port>,...]',
    body: 'Adds one uniquely named peer by 64-character lowercase hex ID. Optional TCP mappings. You cannot add your own ID. The connection is established even without mappings.'
  },
  {
    title: 'peer list',
    usage: 'cwp2p peer list   (alias: cwp2p peer ls)',
    body: 'Lists peers with status, connection type, selected-pair RTT, selected and published endpoints, mappings, and any migrated peers that need to be added again.'
  },
  {
    title: 'peer remove',
    usage: 'cwp2p peer remove <peer ID|name>   (alias: cwp2p peer del)',
    body: 'Removes a peer by exact ID or unique name.'
  },
  {
    title: 'peer port add',
    usage: 'cwp2p peer port add <peer ID|name> <local-port:remote-port>',
    body: 'Adds one TCP mapping. Local ports must be unique across all peers. Repeating an existing mapping succeeds without duplicating it.'
  },
  {
    title: 'peer port remove',
    usage: 'cwp2p peer port remove <peer ID|name> <local-port:remote-port>',
    body: 'Removes that exact mapping. Removing the last mapping leaves the peer configured.'
  },
  {
    title: 'port add',
    usage: 'cwp2p port add <port>',
    body: 'Allows a local TCP port between 1 and 65535. DataChannel mappings do not require this allow-list.'
  },
  {
    title: 'charge',
    usage: 'cwp2p charge <value>',
    body: 'Test Net helper. Spends one canonical seed UTXO into the local ID. Value is a base-10 unsigned number of at least 43. Not shown as a primary tool in this app.'
  },
  {
    title: 'health-check',
    usage: 'cwp2p health-check [--utxo-timeout <duration>]',
    body: 'Probes NetcoreNetwork nodes, updates the node blacklist, and can replace roster bootstrap entries. Works without a running daemon. Consumes Test Net seed UTXOs. Not shown as a primary tool in this app.'
  },
  {
    title: 'version',
    usage: 'cwp2p version',
    body: 'Prints the Causeway CLI version.'
  }
]

const videos = [
  { id: 'xW9VghMCyWs', title: 'Causeway CLI Mac Setup Guide', platforms: ['darwin'] },
  { id: 'TT3-NVyHfoE', title: 'Causeway CLI Windows Setup Guide', platforms: ['win32'] },
  { id: 'gsWaMx56ZRk', title: 'How to Add Peers & Open Ports with Causeway', platforms: ['darwin', 'win32'] },
  { id: '0XN3rwVqwb4', title: 'Causeway CLI WebRTC vs WireGuard', platforms: ['darwin', 'win32'] },
  { id: 'uWhtheGZd5E', title: 'File Sharing, Video Streaming & Live Streaming', platforms: ['darwin', 'win32'] },
  { id: 'HpBc0GjZeJw', title: 'How to Share Files Across Teams with Causeway', platforms: ['darwin', 'win32'] }
]

export default function LearnPage({ snapshot }: { snapshot: AppSnapshot }): React.JSX.Element {
  const shownVideos = videos.filter((video) => video.platforms.includes(snapshot.platform))

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Learn"
        description="Causeway is the usable layer on NetcoreNetwork. NetcoreNetwork helps devices find and authenticate each other. After that, application data moves directly between the two machines."
        actions={
          <Button onClick={() => void window.causeway.openExternal(snapshot.learnUrl)}>
            netcore.network/learn
          </Button>
        }
      />

      <section>
        <h3 className="m-0 text-[15px] font-semibold">How the pieces fit</h3>
        <p className="mt-3 mb-3 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Each computer running Causeway has a NetcoreNetwork ID. You exchange IDs, add each other as
          peers, and map ports. A service that listens on the other machine then appears on localhost
          here. Coordination uses a distributed key-value store. Relays are only a fallback when a
          direct path is blocked.
        </p>
        <p className="m-0 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Keep the Causeway state file private. This app stores it in the application data folder, not
          in the connected install folder, so a Terminal daemon and this app do not share an identity.
          This UI never shows private keys.
        </p>
      </section>

      <section>
        <h2 className="mb-6 text-[1.65rem] font-bold tracking-tight">Every CLI command</h2>
        <div className="flex flex-col gap-6">
          {commands.map((command) => (
            <article key={command.usage}>
              <h3 className="m-0 text-[15px] font-semibold">{command.title}</h3>
              <code className="mt-2 block overflow-x-auto rounded-xl border border-line bg-bg px-3.5 py-2.5 font-mono text-[13px] text-muted">
                {command.usage}
              </code>
              <p className="mt-2 mb-0 max-w-[62ch] text-sm leading-relaxed text-muted">{command.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3 className="m-0 text-[15px] font-semibold">Environment and state</h3>
        <p className="mt-3 mb-0 max-w-[62ch] text-sm leading-relaxed text-muted">
          <code>CWP2P_STATE</code> selects the JSON state file. <code>CWP2P_SOCKET</code> selects the
          command socket. This app sets both under its own application data directory.{' '}
          <code>CWP2P_TURN_PASSWORD</code> can override the built-in TURN password on a fresh or
          migrated state. Editable JSON network fields are rosterBootstrap, netCoreNodeBlacklist,
          stunServers, turnServers, turnUsername, and turnPassword.
        </p>
      </section>

      <section>
        <h2 className="mb-6 text-[1.65rem] font-bold tracking-tight">Videos</h2>
        <div className="grid grid-cols-1 gap-6 @min-[840px]:grid-cols-2">
          {shownVideos.map((video) => (
            <article key={video.id}>
              <h3 className="mb-3 text-[15px] font-semibold">{video.title}</h3>
              <iframe
                className="aspect-video w-full rounded-2xl border-0 bg-navy"
                src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                title={video.title}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
