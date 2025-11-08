import { SmartCompletions } from "./smart_completions.js";
import { SmartCompletion } from "./smart_completion.js";
import { AjsonSingleFileCollectionDataAdapter } from "smart-collections/adapters/ajson_single_file.js";
// import { SmartCompletionTemplateAdapter } from "./adapters/template.js";
import { SmartCompletionUserAdapter } from "./adapters/user.js";
import { ActionCompletionAdapter } from "./adapters/action.js";
import { ActionXmlCompletionAdapter } from "./adapters/action_xml.js";
import { SmartCompletionSystemAdapter } from "./adapters/system.js";
import { SmartCompletionVariableAdapter } from "./adapters/variable.js";
import { ContextCompletionAdapter } from "./adapters/context.js";

// default config for smart_completions
export const smart_completions_default_config = {
  class: SmartCompletions,
  data_adapter: AjsonSingleFileCollectionDataAdapter,
  item_type: SmartCompletion,
  completion_adapters: {
    // SmartCompletionTemplateAdapter,
    ContextCompletionAdapter,
    SmartCompletionUserAdapter,
    ActionCompletionAdapter,
    ActionXmlCompletionAdapter,
    SmartCompletionSystemAdapter,
    SmartCompletionVariableAdapter,
  }
}

export {
  SmartCompletions,
  SmartCompletion,
  smart_completions_default_config as smart_completions
}