import * as cache from "@actions/cache";
import * as core from "@actions/core";

import { Events, Inputs, State } from "./constants";
import * as utils from "./utils/actionUtils";

async function run(): Promise<void> {
    try {
        if (!cache.isEnable()) {
            
            if (utils.isGhes()){
                utils.logWarning(
                    "Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check if ArtifactCache is enabled or not using config 'app.actions.artifactcache.enabled'."
                );
            }
            else{
                utils.logWarning(
                    "Something is going wrong with ArtifactCache service which supports cache actions. Please check https://www.githubstatus.com/ for any ongoing issue in actions."
                );
            }
            utils.setCacheHitOutput(false);
            return;
        }

        // Validate inputs, this can cause task failure
        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        const primaryKey = core.getInput(Inputs.Key, { required: true });
        core.saveState(State.CachePrimaryKey, primaryKey);

        const restoreKeys = utils.getInputAsArray(Inputs.RestoreKeys);
        const cachePaths = utils.getInputAsArray(Inputs.Path, {
            required: true
        });

        try {
            const cacheKey = await cache.restoreCache(
                cachePaths,
                primaryKey,
                restoreKeys
            );
            if (!cacheKey) {
                core.info(
                    `Cache not found for input keys: ${[
                        primaryKey,
                        ...restoreKeys
                    ].join(", ")}`
                );
                return;
            }

            // Store the matched cache key
            utils.setCacheState(cacheKey);

            const isExactKeyMatch = utils.isExactKeyMatch(primaryKey, cacheKey);
            utils.setCacheHitOutput(isExactKeyMatch);

            core.info(`Cache restored from key: ${cacheKey}`);
        } catch (error) {
            if (error.name === cache.ValidationError.name) {
                throw error;
            } else {
                utils.logWarning(error.message);
                utils.setCacheHitOutput(false);
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();

export default run;
