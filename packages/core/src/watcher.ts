import watcher, { SubscribeCallback } from "@parcel/watcher";
import { Modification } from "./types";
import { Emitter } from "./events";

type SyncFn = (modification: Modification, path: string) => Promise<boolean>;
type BuildFn = () => Promise<void>;

export async function createWatcher(
  emitter: Emitter,
  paths: Array<string>,
  sync: SyncFn,
  build: BuildFn
) {
  const onChange: SubscribeCallback = async (error, events) => {
    if (error) {
      console.error(error);
      return;
    }

    let rebuild = false;

    for (const event of events) {
      if (await sync(event.type, event.path)) {
        emitter.emit("watch:file-changed", {
          filePath: event.path,
          modification: event.type,
        });
        rebuild = true;
      }
    }

    if (rebuild) {
      await build();
    }
  };

  const subscriptions = await Promise.all(
    paths.map((path) => watcher.subscribe(path, onChange))
  );

  return {
    unsubscribe: async () => {
      await Promise.all(
        subscriptions.map((subscription) => subscription.unsubscribe())
      );
      return;
    },
  };
}
