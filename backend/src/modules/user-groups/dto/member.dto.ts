import { IsUUID, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add to the group' })
  @IsUUID()
  userId: string;
}

export class AddMembersDto {
  @ApiProperty({ description: 'User IDs to add to the group', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds: string[];
}

export class RemoveMemberDto {
  @ApiProperty({ description: 'User ID to remove from the group' })
  @IsUUID()
  userId: string;
}
