// @ts-check
import antfu from "@antfu/eslint-config";


export default antfu(
  {
    type: "lib",
    stylistic: {
      indent: 2,
      quotes: "double",
      semi: true,
      overrides: {
        "no-console": ["off"],
        "style/comma-dangle": ["error", "never"],
        "style/padded-blocks": ["off"],
        "style/indent": ["error", 2, {
          offsetTernaryExpressions: false,
          SwitchCase: 1
        }],
        "style/brace-style": ["error", "stroustrup", { allowSingleLine: false }],
        "style/no-multiple-empty-lines": ["error", { maxBOF: 0, max: 2, maxEOF: 1 }],
        "import/newline-after-import": ["error", {
          count: 2,
          exactCount: true,
          considerComments: true
        }],
        "grouped-accessor-pairs": ["error", "getBeforeSet"],
        "perfectionist/sort-imports": [
          "error",
          {
            type: "line-length",
            order: "asc",
            groups: [
              // Types
              "builtin-type",
              "external-type",
              "internal-type",
              "aliased-common-type",
              "aliased-extension-core-type",
              "aliased-extension-integrations-type",
              "aliased-extension-lib-type",
              "aliased-extension-services-type",
              "aliased-extension-type",
              "aliased-webview-ui-type",
              "parent-type",
              "sibling-type",
              "index-type",
              "type",
              // Modules
              "builtin",
              "external",
              "internal",
              "aliased-common",
              "aliased-extension-core",
              "aliased-extension-integrations",
              "aliased-extension-lib",
              "aliased-extension-services",
              "aliased-extension",
              "aliased-webview-ui",
              "parent",
              "sibling",
              "index",
              "side-effect",
              // Default
              "object",
              "unknown"
            ],
            newlinesBetween: "always",
            customGroups: {
              value: {
                // Common
                "aliased-common": [/^@common\/.*/],
                // Extension
                "aliased-extension-core": [/^@extension\/core\/.*/],
                "aliased-extension-integrations": [/^@extension\/integrations\/.*/],
                "aliased-extension-lib": [/^@extension\/lib\/.*/],
                "aliased-extension-services": [/^@extension\/services\/.*/],
                "aliased-extension": [/^@extension\/.*/],
                // Webview UI
                "aliased-webview-ui": [/^@webview-ui\/.*/]
              },
              type: {
                // Common
                "aliased-common-type": [/^@common\/.*/],
                // Extension
                "aliased-extension-core-type": [/^@extension\/core\/.*/],
                "aliased-extension-integrations-type": [/^@extension\/integrations\/.*/],
                "aliased-extension-lib-type": [/^@extension\/lib\/.*/],
                "aliased-extension-services-type": [/^@extension\/services\/.*/],
                "aliased-extension-type": [/^@extension\/.*/],
                // Webview UI
                "aliased-webview-ui-type": [/^@webview-ui\/.*/]
              }
            }
          }
        ],
        "perfectionist/sort-classes": [
          "error",
          {
            type: "natural",
            partitionByNewLine: true,
            groups: [
              "index-signature",
              "static-property",
              "static-block",
              "decorated-property",
              "protected-property",
              "private-property",
              "property",
              "decorated-accessor-property",
              "protected-accessor-property",
              "private-accessor-property",
              "accessor-property",
              ["get-method", "set-method"],
              "constructor",
              "decorated-method",
              "static-method",
              "protected-method",
              "private-method",
              "method",
              "unknown"
            ]
          }
        ]
      }
    },
    typescript: {
      tsconfigPath: "./tsconfig.json",
      overrides: {
        "ts/prefer-enum-initializers": ["error"],
        "ts/explicit-function-return-type": ["error", {
          allowDirectConstAssertionInArrowFunctions: false,
          allowIIFEs: true
        }],
        "ts/consistent-type-imports": ["error", { prefer: "type-imports" }]
      }
    },
    jsonc: {
      overrides: {
        "jsonc/comma-dangle": ["error", "never"]
      }
    },
    formatters: {
      css: true
    }
  }
);
