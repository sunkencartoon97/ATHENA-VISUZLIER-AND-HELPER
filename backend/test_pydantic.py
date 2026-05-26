from pydantic import BaseModel, ValidationError
from typing import List
class MemAccessInput(BaseModel):
    step_id: int
    container: str
    index: int
    element_size: int
class CacheSimulationRequest(BaseModel):
    memory_accesses: List[MemAccessInput]
try:
    CacheSimulationRequest.model_validate({'memory_accesses': [{'step_id': 1, 'container': 'arr', 'index': 0, 'element_size': 4, 'rw': 'r'}]})
    print('SUCCESS')
except ValidationError as e:
    print('ERROR:', e.errors())
