我想给查找 searchPatent tool 的前端 UI 添加独立的 UI 组件来美化其信息展示，已有的 tool ui 组件有 Display Repositories Tool，src\components\chat\message-renderer.tsx。请你将实施方案放到 spec\03 目录下。

在改造之前我注意到 displayRepositories 似乎内嵌在 message-renderer当中，可以提取为单独的组件，请你分析。

对于searchPatent tool 的UI展示信息可能会有以下的内容，输入参数可能不固定，你可以挑选一些相对重要的来展示。

输入参数：
{
  "company": "Apple",
  "fromDate": "2025-04-09",
  "toDate": "2026-04-09",
  "limit": 25,
  "sortBy": "date",
  "sortOrder": "desc"
}

输入结果：
{
  "provider": "serpapi-google-patents",
  "count": 25,
  "totalHits": 14417,
  "timeRange": {
    "fromDate": "2025-04-09",
    "toDate": "2026-04-09"
  },
  "patents": [
    {
      "patentId": "AU2025279805A1",
      "title": "Chroma quantization in video coding",
      "abstract": "1006320919 A method of signaling additional chroma QP offset values that are specific to quantization groups is provided, in which each quantization group explicitly specifies its own set of chroma QP offset values. Alternatively, a table of possible sets of chroma QP offset values is specified in …",
      "patentDate": "2026-01-15",
      "applicationDate": "2025-12-15",
      "assignees": [
        {
          "name": "Apple Inc."
        }
      ],
      "inventors": [
        {
          "name": "Guy Cote"
        }
      ],
      "cpcCodes": [],
      "sourceUrl": "https://patents.google.com/patent/AU2025279805A1/en"
    },
  ]
}