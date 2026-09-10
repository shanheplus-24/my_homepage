// Complete configuration is served only after administrator authentication.
export default {
  "backend": {
    "name": "password",
    "branch": "main"
  },
  "local_backend": false,
  "media_folder": "public/assets/cms",
  "public_folder": "/assets/cms",
  "site_url": "https://www.shanheplus.com",
  "display_url": "https://www.shanheplus.com",
  "logo_url": "/assets/generated/site-logo-nexus-white-512.png",
  "locale": "zh_Hans",
  "collections": [
    {
      "name": "settings",
      "label": "站点设置",
      "files": [
        {
          "label": "可见站点设置",
          "name": "site",
          "file": "src/data/site.json",
          "format": "json",
          "fields": [
            {
              "label": "站点资料",
              "name": "site",
              "widget": "object",
              "collapsed": false,
              "fields": [
                {
                  "label": "网站名称",
                  "name": "name",
                  "widget": "string"
                },
                {
                  "label": "姓名",
                  "name": "personName",
                  "widget": "string"
                },
                {
                  "label": "页脚身份",
                  "name": "shortRole",
                  "widget": "string"
                },
                {
                  "label": "邮箱",
                  "name": "email",
                  "widget": "string"
                },
                {
                  "label": "SEO 简介",
                  "name": "bio",
                  "widget": "text"
                },
                {
                  "label": "页脚标语",
                  "name": "footerSignature",
                  "widget": "string"
                },
                {
                  "label": "LinkedIn 链接",
                  "name": "links",
                  "widget": "list",
                  "min": 1,
                  "max": 1,
                  "fields": [
                    {
                      "label": "固定 ID",
                      "name": "id",
                      "widget": "hidden",
                      "default": "linkedin"
                    },
                    {
                      "label": "显示名称",
                      "name": "label",
                      "widget": "hidden",
                      "default": "LinkedIn"
                    },
                    {
                      "label": "LinkedIn URL",
                      "name": "href",
                      "widget": "string"
                    }
                  ]
                },
                {
                  "label": "中文资料",
                  "name": "zh",
                  "widget": "object",
                  "collapsed": true,
                  "fields": [
                    {
                      "label": "中文身份",
                      "name": "title",
                      "widget": "string",
                      "required": false
                    },
                    {
                      "label": "中文单位",
                      "name": "affiliation",
                      "widget": "string",
                      "required": false
                    },
                    {
                      "label": "中文简介",
                      "name": "bio",
                      "widget": "text",
                      "required": false
                    }
                  ]
                }
              ]
            },
            {
              "label": "导航菜单",
              "name": "navigation",
              "widget": "list",
              "fields": [
                {
                  "label": "显示名称",
                  "name": "label",
                  "widget": "string"
                },
                {
                  "label": "链接",
                  "name": "href",
                  "widget": "string"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "pages",
      "label": "首页与个人介绍",
      "files": [
        {
          "label": "首页",
          "name": "home",
          "file": "src/content/pages/home.mdx",
          "format": "frontmatter",
          "fields": [
            {
              "label": "SEO 标题",
              "name": "title",
              "widget": "string"
            },
            {
              "label": "SEO 描述",
              "name": "description",
              "widget": "text"
            },
            {
              "label": "首页可见模块",
              "name": "sections",
              "widget": "list",
              "typeKey": "type",
              "types": [
                {
                  "label": "首屏",
                  "name": "hero",
                  "widget": "object",
                  "fields": [
                    {
                      "label": "固定模块 ID",
                      "name": "id",
                      "widget": "string"
                    },
                    {
                      "label": "无障碍标签",
                      "name": "ariaLabel",
                      "widget": "string"
                    },
                    {
                      "label": "标题行",
                      "name": "headingLines",
                      "widget": "list",
                      "field": {
                        "label": "行文本",
                        "name": "line",
                        "widget": "string"
                      }
                    },
                    {
                      "label": "主题标签",
                      "name": "topics",
                      "widget": "list",
                      "field": {
                        "label": "主题",
                        "name": "topic",
                        "widget": "string"
                      }
                    },
                    {
                      "label": "主按钮",
                      "name": "primaryCta",
                      "widget": "object",
                      "fields": [
                        {
                          "label": "显示文字",
                          "name": "label",
                          "widget": "string"
                        },
                        {
                          "label": "链接",
                          "name": "href",
                          "widget": "string"
                        }
                      ]
                    },
                    {
                      "label": "次按钮",
                      "name": "secondaryCta",
                      "widget": "object",
                      "fields": [
                        {
                          "label": "显示文字",
                          "name": "label",
                          "widget": "string"
                        },
                        {
                          "label": "链接",
                          "name": "href",
                          "widget": "string"
                        }
                      ]
                    },
                    {
                      "label": "滚动提示文字",
                      "name": "scrollLabel",
                      "widget": "string"
                    }
                  ]
                },
                {
                  "label": "首页研究方向",
                  "name": "research_highlights",
                  "widget": "object",
                  "fields": [
                    {
                      "label": "固定模块 ID",
                      "name": "id",
                      "widget": "string"
                    },
                    {
                      "label": "标题",
                      "name": "heading",
                      "widget": "string"
                    },
                    {
                      "label": "研究卡片",
                      "name": "items",
                      "widget": "relation",
                      "collection": "research",
                      "multiple": true,
                      "search_fields": [
                        "title",
                        "summary"
                      ],
                      "value_field": "{{slug}}",
                      "display_fields": [
                        "title"
                      ]
                    }
                  ]
                },
                {
                  "label": "首页精选论文",
                  "name": "selected_publications",
                  "widget": "object",
                  "fields": [
                    {
                      "label": "固定模块 ID",
                      "name": "id",
                      "widget": "string"
                    },
                    {
                      "label": "标题",
                      "name": "heading",
                      "widget": "string"
                    },
                    {
                      "label": "论文卡片",
                      "name": "items",
                      "widget": "relation",
                      "collection": "publications",
                      "multiple": true,
                      "search_fields": [
                        "title",
                        "venue",
                        "year"
                      ],
                      "value_field": "{{slug}}",
                      "display_fields": [
                        "title",
                        "year"
                      ]
                    },
                    {
                      "label": "查看全部按钮",
                      "name": "allItemsCta",
                      "widget": "object",
                      "fields": [
                        {
                          "label": "显示文字",
                          "name": "label",
                          "widget": "string"
                        },
                        {
                          "label": "链接",
                          "name": "href",
                          "widget": "string"
                        }
                      ]
                    }
                  ]
                },
                {
                  "label": "首页动态",
                  "name": "news",
                  "widget": "object",
                  "fields": [
                    {
                      "label": "固定模块 ID",
                      "name": "id",
                      "widget": "string"
                    },
                    {
                      "label": "标题",
                      "name": "heading",
                      "widget": "string"
                    },
                    {
                      "label": "动态卡片",
                      "name": "items",
                      "widget": "relation",
                      "collection": "news",
                      "multiple": true,
                      "search_fields": [
                        "title",
                        "summary",
                        "date"
                      ],
                      "value_field": "{{slug}}",
                      "display_fields": [
                        "title",
                        "date"
                      ]
                    }
                  ]
                },
                {
                  "label": "合作联系模块",
                  "name": "collaboration_cta",
                  "widget": "object",
                  "fields": [
                    {
                      "label": "固定模块 ID",
                      "name": "id",
                      "widget": "string"
                    },
                    {
                      "label": "标题",
                      "name": "heading",
                      "widget": "string"
                    },
                    {
                      "label": "标题高亮",
                      "name": "headingHighlight",
                      "widget": "string",
                      "required": false
                    },
                    {
                      "label": "正文",
                      "name": "body",
                      "widget": "text"
                    },
                    {
                      "label": "主题标签",
                      "name": "topics",
                      "widget": "list",
                      "field": {
                        "label": "主题",
                        "name": "topic",
                        "widget": "string"
                      }
                    },
                    {
                      "label": "按钮",
                      "name": "cta",
                      "widget": "object",
                      "fields": [
                        {
                          "label": "显示文字",
                          "name": "label",
                          "widget": "string"
                        },
                        {
                          "label": "链接",
                          "name": "href",
                          "widget": "string"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "name": "about-en",
          "label": "About 英文介绍与照片",
          "file": "src/content/pages/about-en.mdx",
          "fields": [
            {
              "name": "title",
              "label": "页面标题",
              "widget": "string"
            },
            {
              "name": "description",
              "label": "页面简介",
              "widget": "text"
            },
            {
              "name": "image",
              "label": "联系卡片照片",
              "widget": "object",
              "fields": [
                {
                  "name": "src",
                  "label": "图片",
                  "widget": "image"
                },
                {
                  "name": "alt",
                  "label": "图片说明",
                  "widget": "string"
                }
              ]
            },
            {
              "name": "body",
              "label": "个人介绍",
              "widget": "markdown"
            }
          ]
        },
        {
          "name": "about-zh",
          "label": "About 中文介绍",
          "file": "src/content/pages/about-zh.mdx",
          "fields": [
            {
              "name": "title",
              "label": "页面标题",
              "widget": "string"
            },
            {
              "name": "description",
              "label": "页面简介",
              "widget": "text"
            },
            {
              "name": "body",
              "label": "个人介绍",
              "widget": "markdown"
            }
          ]
        }
      ]
    },
    {
      "name": "publications",
      "label": "论文",
      "label_singular": "论文",
      "folder": "src/data/publication-overrides",
      "create": false,
      "extension": "json",
      "format": "json",
      "slug": "{{slug}}",
      "identifier_field": "title",
      "summary": "{{year}} - {{title}}",
      "sortable_fields": [
        "year",
        "title",
        "venue"
      ],
      "fields": [
        {
          "name": "id",
          "widget": "hidden",
          "label": "论文标识"
        },
        {
          "name": "visibility",
          "label": "收录状态",
          "widget": "select",
          "options": [
            {
              "label": "自动收录",
              "value": "auto"
            },
            {
              "label": "确认发布",
              "value": "published"
            },
            {
              "label": "隐藏（继续同步）",
              "value": "hidden"
            },
            {
              "label": "排除（停止再次收录）",
              "value": "excluded"
            }
          ],
          "default": "auto"
        },
        {
          "name": "assistant",
          "label": "自动信息与识别依据",
          "widget": "publication-assistant",
          "required": false
        },
        {
          "name": "reviewedAutomaticRevision",
          "label": "信息核对（仅自动新增论文）",
          "widget": "publication-review",
          "required": false
        },
        {
          "name": "taxonomyMode",
          "label": "分类维护方式",
          "widget": "select",
          "options": [
            {
              "label": "自动（跟随同步结果）",
              "value": "auto"
            },
            {
              "label": "手动（保留下面填写的值）",
              "value": "manual"
            }
          ],
          "default": "auto"
        },
        {
          "name": "domains",
          "label": "研究领域",
          "widget": "select",
          "multiple": true,
          "required": false,
          "options": [
            "Water",
            "Energy",
            "Food"
          ]
        },
        {
          "name": "methods",
          "label": "研究方法",
          "widget": "select",
          "multiple": true,
          "required": false,
          "options": [
            "Models",
            "Materials",
            "Devices",
            "AI"
          ]
        },
        {
          "name": "imageMode",
          "label": "摘要图维护方式",
          "widget": "select",
          "options": [
            {
              "label": "自动（跟随同步结果）",
              "value": "auto"
            },
            {
              "label": "手动（保留下面填写的值）",
              "value": "manual"
            }
          ],
          "default": "auto"
        },
        {
          "name": "image",
          "label": "摘要图（手动模式下留空可移除）",
          "widget": "object",
          "required": false,
          "fields": [
            {
              "name": "src",
              "label": "上传／选择图片",
              "widget": "image",
              "required": false
            },
            {
              "name": "alt",
              "label": "图片说明",
              "widget": "string",
              "required": false
            }
          ]
        },
        {
          "name": "authorsMode",
          "label": "作者维护方式",
          "widget": "select",
          "options": [
            {
              "label": "自动（跟随同步结果）",
              "value": "auto"
            },
            {
              "label": "手动（保留下面填写的值）",
              "value": "manual"
            }
          ],
          "default": "auto"
        },
        {
          "name": "authorDetails",
          "label": "作者全名与贡献（拖动可排序）",
          "widget": "list",
          "summary": "{{fields.name}}",
          "fields": [
            {
              "name": "name",
              "label": "作者全名",
              "widget": "string",
              "required": true
            },
            {
              "name": "coFirst",
              "label": "共同第一作者",
              "widget": "boolean",
              "default": false
            },
            {
              "name": "corresponding",
              "label": "通讯作者",
              "widget": "boolean",
              "default": false
            },
            {
              "name": "isSelf",
              "label": "这是我（高亮）",
              "widget": "boolean",
              "default": false
            },
            {
              "name": "orcid",
              "label": "作者 ORCID URL",
              "widget": "string",
              "required": false
            }
          ]
        },
        {
          "name": "metadataMode",
          "label": "书目信息维护方式",
          "widget": "select",
          "options": [
            {
              "label": "自动（跟随同步结果）",
              "value": "auto"
            },
            {
              "label": "手动（保留下面填写的值）",
              "value": "manual"
            }
          ],
          "default": "auto"
        },
        {
          "name": "title",
          "label": "标题",
          "widget": "string",
          "required": true
        },
        {
          "name": "venue",
          "label": "期刊",
          "widget": "string",
          "required": true
        },
        {
          "name": "year",
          "label": "年份",
          "widget": "number",
          "value_type": "int",
          "min": 1900,
          "max": 2100
        },
        {
          "name": "doiMode",
          "label": "DOI 维护方式",
          "widget": "select",
          "options": [
            {
              "label": "自动（更新 DOI / 发表状态）",
              "value": "auto"
            },
            {
              "label": "手动（锁定）",
              "value": "manual"
            }
          ],
          "default": "auto"
        },
        {
          "name": "doi",
          "label": "DOI",
          "widget": "string",
          "required": false
        },
        {
          "name": "statusMode",
          "label": "发表状态维护方式",
          "widget": "select",
          "options": [
            {
              "label": "自动（更新 DOI / 发表状态）",
              "value": "auto"
            },
            {
              "label": "手动（锁定）",
              "value": "manual"
            }
          ],
          "default": "auto"
        },
        {
          "name": "status",
          "label": "发表状态",
          "widget": "select",
          "options": [
            "published",
            "accepted",
            "in-review",
            "working-paper",
            "forthcoming"
          ],
          "default": "published"
        },
        {
          "name": "sortOrder",
          "label": "同年手动排序（数字越小越靠前）",
          "widget": "number",
          "value_type": "int",
          "required": false
        }
      ],
      "delete": false
    },
    {
      "name": "publication_imports",
      "label": "添加论文 · DOI",
      "label_singular": "DOI 导入",
      "folder": "src/data/publication-imports",
      "create": true,
      "extension": "json",
      "format": "json",
      "identifier_field": "doi",
      "slug": "{{slug}}",
      "summary": "{{doi}}",
      "fields": [
        {
          "name": "doi",
          "label": "DOI 或 DOI 链接",
          "widget": "string",
          "required": true
        },
        {
          "name": "confirmAuthorship",
          "label": "我确认自己是这篇论文的作者",
          "hint": "仅在数据库暂时无法核验身份时作为人工确认依据；仍会检查书目信息。",
          "widget": "boolean",
          "default": false
        },
        {
          "name": "note",
          "label": "备注",
          "widget": "text",
          "required": false
        }
      ]
    },
    {
      "name": "research",
      "label": "研究项目",
      "label_singular": "研究项目",
      "folder": "src/content/research",
      "create": true,
      "extension": "mdx",
      "format": "frontmatter",
      "slug": "{{slug}}",
      "identifier_field": "title",
      "summary": "{{title}}",
      "sortable_fields": [
        "title"
      ],
      "fields": [
        {
          "label": "标题",
          "name": "title",
          "widget": "string"
        },
        {
          "label": "项目图片",
          "name": "image",
          "widget": "object",
          "collapsed": false,
          "fields": [
            {
              "label": "图片",
              "name": "src",
              "widget": "image"
            },
            {
              "label": "替代文本",
              "name": "alt",
              "widget": "string"
            }
          ]
        },
        {
          "label": "摘要",
          "name": "summary",
          "widget": "text"
        },
        {
          "label": "相关论文",
          "name": "relatedPublications",
          "widget": "relation",
          "collection": "publications",
          "multiple": true,
          "required": false,
          "search_fields": [
            "title",
            "venue",
            "year"
          ],
          "value_field": "{{slug}}",
          "display_fields": [
            "title",
            "year"
          ]
        },
        {
          "label": "正文",
          "name": "body",
          "widget": "markdown",
          "required": false
        }
      ]
    },
    {
      "name": "news",
      "label": "动态",
      "label_singular": "动态",
      "folder": "src/content/news",
      "create": true,
      "extension": "mdx",
      "format": "frontmatter",
      "slug": "{{year}}-{{month}}-{{slug}}",
      "identifier_field": "title",
      "summary": "{{date}} - {{title}}",
      "sortable_fields": [
        "date",
        "title"
      ],
      "fields": [
        {
          "label": "标题",
          "name": "title",
          "widget": "string"
        },
        {
          "label": "日期",
          "name": "date",
          "widget": "datetime",
          "date_format": "YYYY-MM-DD",
          "time_format": false,
          "format": "YYYY-MM-DD"
        },
        {
          "label": "摘要",
          "name": "summary",
          "widget": "text"
        },
        {
          "label": "图片",
          "name": "image",
          "widget": "object",
          "required": false,
          "collapsed": true,
          "fields": [
            {
              "label": "图片",
              "name": "src",
              "widget": "image"
            },
            {
              "label": "替代文本",
              "name": "alt",
              "widget": "string"
            }
          ]
        },
        {
          "label": "嵌入视频",
          "name": "embeds",
          "widget": "list",
          "required": false,
          "fields": [
            {
              "label": "标题",
              "name": "title",
              "widget": "string"
            },
            {
              "label": "视频链接",
              "name": "src",
              "widget": "string",
              "pattern": [
                "^https?://.+",
                "Use a full URL starting with http:// or https://"
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "academic-info",
      "label": "关于 / 简历条目",
      "label_singular": "关于 / 简历条目",
      "folder": "src/content/academic-info",
      "create": true,
      "extension": "mdx",
      "format": "frontmatter",
      "slug": "{{slug}}",
      "identifier_field": "title",
      "summary": "{{category}} - {{date}} - {{title}}",
      "sortable_fields": [
        "category",
        "date",
        "order",
        "title"
      ],
      "view_groups": [
        {
          "label": "分类",
          "field": "category"
        }
      ],
      "fields": [
        {
          "label": "Category",
          "name": "category",
          "widget": "select",
          "options": [
            "education",
            "fellowship",
            "award",
            "selected-publication",
            "talk"
          ]
        },
        {
          "label": "英文标题",
          "name": "title",
          "widget": "string"
        },
        {
          "label": "中文标题",
          "name": "titleZh",
          "widget": "string",
          "required": false
        },
        {
          "label": "英文机构",
          "name": "organization",
          "widget": "string"
        },
        {
          "label": "中文机构",
          "name": "organizationZh",
          "widget": "string",
          "required": false
        },
        {
          "label": "英文日期",
          "name": "date",
          "widget": "string"
        },
        {
          "label": "中文日期",
          "name": "dateZh",
          "widget": "string",
          "required": false
        },
        {
          "label": "英文地点",
          "name": "location",
          "widget": "string",
          "required": false
        },
        {
          "label": "中文地点",
          "name": "locationZh",
          "widget": "string",
          "required": false
        },
        {
          "label": "英文描述",
          "name": "description",
          "widget": "text",
          "required": false
        },
        {
          "label": "中文描述",
          "name": "descriptionZh",
          "widget": "text",
          "required": false
        },
        {
          "label": "英文要点",
          "name": "points",
          "widget": "list",
          "required": false,
          "field": {
            "label": "要点",
            "name": "point",
            "widget": "string"
          }
        },
        {
          "label": "中文要点",
          "name": "pointsZh",
          "widget": "list",
          "required": false,
          "field": {
            "label": "中文要点",
            "name": "point",
            "widget": "string"
          }
        },
        {
          "label": "图片",
          "name": "image",
          "widget": "object",
          "required": false,
          "collapsed": true,
          "fields": [
            {
              "label": "图片",
              "name": "src",
              "widget": "image"
            },
            {
              "label": "替代文本",
              "name": "alt",
              "widget": "string"
            }
          ]
        },
        {
          "label": "Logo",
          "name": "logos",
          "widget": "list",
          "required": false,
          "fields": [
            {
              "label": "Logo",
              "name": "src",
              "widget": "image"
            },
            {
              "label": "替代文本",
              "name": "alt",
              "widget": "string"
            }
          ]
        },
        {
          "label": "命名链接",
          "name": "links",
          "widget": "list",
          "required": false,
          "fields": [
            {
              "label": "显示文字",
              "name": "label",
              "widget": "string"
            },
            {
              "label": "链接",
              "name": "href",
              "widget": "string",
              "pattern": [
                "^https?://.+",
                "Use a full URL starting with http:// or https://"
              ]
            }
          ]
        },
        {
          "label": "排序",
          "name": "order",
          "widget": "number",
          "value_type": "int",
          "default": 0
        }
      ]
    }
  ],
  "load_config_file": false,
  "publish_mode": "simple"
};
