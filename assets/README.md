# M238 review layout

`m238-review-template.pptx` preserves the slide geometry, themes, editable chart and table styles from the M238 reference deck provided for this dashboard. Report cells, employee names and amounts, issue/support content, speaker notes, metadata and the embedded chart workbook have been cleared or replaced with neutral placeholders. Do not replace this file with an unsanitized report in this public repository.

`lib/m238-template-presentation.ts` fills all report content and chart workbook cells on the server. The template must retain its 11 slides and table order; the API supplies canonical M238 sales for the selected periods. The complete weekly export remains separate.
