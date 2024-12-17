from typing import Literal, Annotated

from app.routes.schemas.base import BaseSchema
from app.repositories.models.common import Base64EncodedBytes
from pydantic import Field, Discriminator, JsonValue, root_validator

from mypy_boto3_bedrock_runtime.literals import (
    DocumentFormatType,
    ImageFormatType,
)

type_model_name = Literal[
    "claude-instant-v1",
    "claude-v2",
    "claude-v3-sonnet",
    "claude-v3.5-sonnet",
    "claude-v3.5-sonnet-v2",
    "claude-v3.5-haiku",
    "claude-v3-haiku",
    "claude-v3-opus",
    "mistral-7b-instruct",
    "mixtral-8x7b-instruct",
    "mistral-large",
    # New Amazon Nova models
    "amazon-nova-pro",
    "amazon-nova-lite",
    "amazon-nova-micro",
]


class TextContent(BaseSchema):
    content_type: Literal["text"] = Field(
        ..., description="Content type. Note that image is only available for claude 3."
    )
    body: str = Field(..., description="Content body.")


class ImageContent(BaseSchema):
    content_type: Literal["image"] = Field(
        ..., description="Content type. Note that image is only available for claude 3."
    )
    media_type: str = Field(
        ...,
        description="MIME type of the image. Must be specified if `content_type` is `image`.",
    )
    body: Base64EncodedBytes = Field(..., description="Content body.")


class AttachmentContent(BaseSchema):
    content_type: Literal["attachment"] = Field(
        ..., description="Content type. Note that image is only available for claude 3."
    )
    file_name: str = Field(
        ...,
        description="File name of the attachment. Must be specified if `content_type` is `attachment`.",
    )
    body: Base64EncodedBytes = Field(..., description="Content body.")


class FeedbackInput(BaseSchema):
    thumbs_up: bool
    category: str | None = Field(
        None, description="Reason category. Required if thumbs_up is False."
    )
    comment: str | None = Field(None, description="optional comment")

    @root_validator(pre=True)
    def check_category(cls, values):
        thumbs_up = values.get("thumbs_up")
        category = values.get("category")

        if not thumbs_up and category is None:
            raise ValueError("category is required if `thumbs_up` is `False`")

        return values


class FeedbackOutput(BaseSchema):
    thumbs_up: bool
    category: str
    comment: str

class FeedbackMessage(BaseSchema):
    conversation_id: str
    message_id: str
    create_time: float
    feedback: FeedbackOutput

class FeedbackList(BaseSchema):
    feedbacks: list[FeedbackMessage]

class Chunk(BaseSchema):
    content: str
    content_type: str
    source: str
    rank: int


class ToolUseContentBody(BaseSchema):
    tool_use_id: str
    name: str
    input: dict[str, JsonValue]


class ToolUseContent(BaseSchema):
    content_type: Literal["toolUse"] = Field(
        ..., description="Content type. Note that image is only available for claude 3."
    )
    body: ToolUseContentBody


class TextToolResult(BaseSchema):
    text: str


class JsonToolResult(BaseSchema):
    json_: dict[str, JsonValue] = Field(
        alias="json"
    )  # `json` is a reserved keyword on pydantic


class ImageToolResult(BaseSchema):
    format: ImageFormatType
    image: Base64EncodedBytes


class DocumentToolResult(BaseSchema):
    format: DocumentFormatType
    name: str
    document: Base64EncodedBytes


ToolResult = TextToolResult | JsonToolResult | ImageToolResult | DocumentToolResult


class ToolResultContentBody(BaseSchema):
    tool_use_id: str
    content: list[ToolResult]
    status: Literal["error", "success"]


class ToolResultContent(BaseSchema):
    content_type: Literal["toolResult"] = Field(
        ..., description="Content type. Note that image is only available for claude 3."
    )
    body: ToolResultContentBody


Content = Annotated[
    TextContent | ImageContent | AttachmentContent | ToolUseContent | ToolResultContent,
    Discriminator("content_type"),
]


class SimpleMessage(BaseSchema):
    role: str
    content: list[Content]


class MessageInput(BaseSchema):
    role: str
    content: list[Content]
    model: type_model_name
    parent_message_id: str | None
    message_id: str | None = Field(
        None, description="Unique message id. If not provided, it will be generated."
    )


class MessageOutput(BaseSchema):
    role: str = Field(..., description="Role of the message. Either `user` or `bot`.")
    content: list[Content]
    model: type_model_name
    children: list[str]
    feedback: FeedbackOutput | None
    used_chunks: list[Chunk] | None
    parent: str | None
    thinking_log: list[SimpleMessage] | None


class ChatInput(BaseSchema):
    conversation_id: str
    message: MessageInput
    bot_id: str | None = Field(None)
    continue_generate: bool = Field(False)


class ChatOutput(BaseSchema):
    conversation_id: str
    message: MessageOutput
    bot_id: str | None
    create_time: float


class RelatedDocument(BaseSchema):
    content: ToolResult
    source_id: str
    source_name: str | None = None
    source_link: str | None = None


class ConversationMetaOutput(BaseSchema):
    id: str
    title: str
    create_time: float
    model: str
    bot_id: str | None


class Conversation(BaseSchema):
    id: str
    title: str
    create_time: float
    message_map: dict[str, MessageOutput]
    last_message_id: str
    bot_id: str | None
    should_continue: bool


class NewTitleInput(BaseSchema):
    new_title: str


class ProposedTitle(BaseSchema):
    title: str
