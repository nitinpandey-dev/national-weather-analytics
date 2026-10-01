from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseConnector(ABC):
    @abstractmethod
    def fetch_data(self) -> List[Dict[str, Any]]:
        """Fetch raw items from external source"""
        pass
        
    @abstractmethod
    def normalize_payload(self, raw_item: Dict[str, Any]) -> Dict[str, Any]:
        """Convert external format to normalized platform weather report payload"""
        pass
