from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ReportReasonEnum(str, Enum):
    spam = "spam"
    harassment = "harassment"
    inappropriate_content = "inappropriate_content"
    fake_profile = "fake_profile"
    other = "other"


class ReportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: ReportReasonEnum
    detail: Optional[str] = Field(None, max_length=1000)
